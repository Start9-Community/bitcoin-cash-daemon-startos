import { sdk } from './sdk'
import { socksHostId, socksPort } from 'tor-startos/startos/utils'
import {
  bridgeAddress,
  Network,
  NETWORKS,
  networkFlag,
  networkPorts,
  rootDir,
  rpcPlaintextPort,
} from './utils'
import { bchdConf } from './fileModels/bchd.conf'
import { storeJson } from './fileModels/store.json'
import { mainMounts } from './mounts'

export { mainMounts }

export const main = sdk.setupMain(async ({ effects }) => {
  console.log('Starting BCHD!')

  const conf = await bchdConf.read().const(effects)
  const store = await storeJson.read().once()
  const network: Network = NETWORKS.includes(store?.network as Network)
    ? (store!.network as Network)
    : 'mainnet'
  const { rpc: rpcPort, peer: peerPort, grpc: grpcPort } = networkPorts[network]
  const netFlag = networkFlag[network]
  const netLabel = network.charAt(0).toUpperCase() + network.slice(1)
  const activeCred = store?.rpcCredentials?.[0]
  const rpcUser = activeCred?.username ?? store?.rpcUser ?? 'bchd'
  const rpcPassword = activeCred?.password ?? store?.rpcPassword ?? ''
  const torEnabled = store?.torEnabled ?? true

  const grpcEnabled = (conf?.grpclisten ?? '') !== ''
  const onlynetList = ((conf?.onlynet as string[] | undefined) ?? []).filter(
    Boolean,
  )
  const onlynetActive = onlynetList.length > 0
  const onionOnly = onlynetActive && onlynetList.every((n) => n === 'onion')
  const externalip = (store?.externalip ?? []).filter(Boolean)

  // Read and clear reindex flags
  const reindexChainstate = store?.reindexChainstate ?? false
  if (reindexChainstate) {
    await storeJson.merge(effects, { reindexChainstate: false })
  }

  // Per-index rebuild visibility (logs only). When an index is toggled on, BCHD
  // rebuilds it from genesis on this start. BCHD's own log only shows an
  // AGGREGATE "INDX: Indexed N blocks ... height H/Y (PP%)" line, so announce
  // which index it is to make that progress attributable per-index. Flags are
  // cleared by the 'clear-index-pending' oneshot once RPC confirms catch-up done.
  if (store?.txindexCatchupPending) {
    console.log(
      '[Index Rebuild] Transaction Index is (re)building from genesis on this start. ' +
        'Live progress follows as "INDX: Indexed N blocks ... height H/Y (PP%)" log lines.',
    )
  }
  if (store?.addrindexCatchupPending) {
    console.log(
      '[Index Rebuild] Address Index is (re)building from genesis on this start ' +
        '(the slow index — upstream bchd issue #219). ' +
        'Live progress follows as "INDX: Indexed N blocks ... height H/Y (PP%)" log lines.',
    )
  }

  // Tor SOCKS over the bridge. The mapped value only changes when the address
  // itself does — with the 9050 fallback it stays constant across tor
  // install/update/uninstall, so this .const() never restarts BCHD unless tor
  // lands on a different port (then one healing restart). A dead bridge address
  // is just connection-refused, so the Tor flags are safe to pass whenever the
  // user has Tor routing enabled, even before Tor is installed.
  const torSocks = await bridgeAddress(effects, {
    packageId: 'tor',
    hostId: socksHostId,
    internalPort: socksPort,
    fallbackPort: socksPort,
  }).const()

  // Track Tor install/run state dynamically for the health check (no restart).
  // Registered unconditionally so it arms and heals regardless of start order.
  let torInstalled = false
  let torRunning = false
  sdk.getStatus(effects, { packageId: 'tor' }).onChange((status) => {
    torInstalled = status !== null
    torRunning = status?.desired.main === 'running'
    return { cancel: false }
  })

  const bchdArgs: string[] = [
    `--configfile=${rootDir}/bchd.conf`,
    `--datadir=${rootDir}`,
    `--rpcuser=${rpcUser}`,
    `--rpcpass=${rpcPassword}`,
    `--rpclisten=0.0.0.0:${rpcPort}`,
    `--listen=0.0.0.0:${peerPort}`,
  ]

  if (netFlag) {
    bchdArgs.push(netFlag)
  }

  // Apply onlynet restrictions only when explicitly narrowed from default-all.
  for (const net of onlynetList) {
    bchdArgs.push(`--onlynet=${net}`)
  }

  for (const ip of externalip) {
    bchdArgs.push(`--externalip=${ip}`)
  }

  // txindex / addrindex (independent toggles, both incompatible with fastsync).
  // addrindex requires txindex; it's the slow index (issue #219) so it's only
  // passed when explicitly enabled alongside txindex.
  const txindexOn = conf?.txindex === 1
  const addrindexOn = conf?.addrindex === 1
  if (txindexOn) {
    bchdArgs.push('--txindex')
    if (addrindexOn) {
      bchdArgs.push('--addrindex')
    }
  }

  // fastsync: skip block validation before latest checkpoint (incompatible with txindex/addrindex)
  if (conf?.fastsync === 1) {
    bchdArgs.push('--fastsync')
  }

  if (torEnabled) {
    bchdArgs.push(`--onion=${torSocks}`)
    if (onionOnly) {
      bchdArgs.push(`--proxy=${torSocks}`)
    }
    if (store?.torIsolation) {
      bchdArgs.push('--torisolation')
    }
  }

  if (grpcEnabled) {
    bchdArgs.push(`--grpclisten=0.0.0.0:${grpcPort}`)
  }

  // Reindex chainstate (cleared from store above so it only applies once)
  if (reindexChainstate) {
    bchdArgs.push('--reindexchainstate')
  }

  // BIP 157/158 compact block filters
  if (conf?.nocfilters === 1) {
    bchdArgs.push('--nocfilters')
  }

  // Pruning
  const pruneDepth = store?.pruneDepth ?? 0
  if (pruneDepth > 0) {
    bchdArgs.push('--prune')
    bchdArgs.push(`--prunedepth=${pruneDepth}`)
  }

  bchdArgs.push(`--dbcachesize=${conf?.dbcachesize ?? 450}`)
  bchdArgs.push(`--utxocachemaxsize=${conf?.utxocachemaxsize ?? 1024}`)
  if (conf?.maxpeers != null) {
    bchdArgs.push(`--maxpeers=${conf.maxpeers}`)
  }
  // Raise the RPC client cap above bchd's default of 10. During IBD the health
  // checks (sync, peers, RPC, gRPC) plus any consumer can briefly exceed 10
  // concurrent RPC clients while slow chain-locked calls are in flight, which
  // would otherwise reject calls with "Max RPC clients exceeded".
  bchdArgs.push('--rpcmaxclients=50')
  if (conf?.nopeerbloomfilters === 1) {
    bchdArgs.push('--nopeerbloomfilters')
  }

  // Enable native TLS on RPC and gRPC using the self-signed cert generated
  // by `gencerts` in the nocow oneshot. BCHD otherwise emits:
  //   [WRN] loadConfig: the --notls option is not recommended when binding
  //   RPC to non localhost addresses: 0.0.0.0:<port>
  // at every startup, because the StartOS container network requires binding
  // to a non-loopback interface so the reverse proxy can reach it.
  // The StartOS RPC and gRPC interfaces are declared as pass-through TLS so
  // clients see https:// URLs all the way through.
  bchdArgs.push(`--rpccert=${rootDir}/rpc.cert`)
  bchdArgs.push(`--rpckey=${rootDir}/rpc.key`)

  const bchdSub = sdk.SubContainer.of(
    effects,
    { imageId: 'bchd' },
    mainMounts,
    'node-sub',
  )

  // stunnel SubContainer: accepts plaintext HTTP on 8334, forwards to
  // BCHD's native TLS RPC on 127.0.0.1:8332. Required for ckpool-lineage
  // miners (asicseer-pool, ckpool) which have no TLS/SSL library at all.
  const stunnelSub = sdk.SubContainer.of(
    effects,
    { imageId: 'bchd' },
    mainMounts,
    'stunnel-sub',
  )

  async function rpc(...args: string[]) {
    // RPC now runs under TLS with a self-signed cert; point bchctl at that
    // cert so verification succeeds for internal health-check calls.
    return bchdSub.exec([
      'bchctl',
      `--rpcserver=127.0.0.1:${rpcPort}`,
      `--rpcuser=${rpcUser}`,
      `--rpcpass=${rpcPassword}`,
      `--rpccert=${rootDir}/rpc.cert`,
      ...args,
    ])
  }

  async function rpcWithRetry(...args: string[]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await rpc(...args)
      if (res.exitCode === 0) return res
      if (attempt < 2) await new Promise<void>((r) => setTimeout(r, 2000))
    }
    return rpc(...args)
  }

  async function grpcReady() {
    // Use a LISTEN-state check against /proc so we don't actually open a TCP
    // connection to the gRPC port. bchd's gRPC is HTTP/2 over TLS; any
    // bare TCP probe (nc -z, etc.) that accepts+closes without sending a
    // ClientHello causes the Go stdlib to log a `TLS handshake error
    // from <addr>: EOF` every probe interval. /proc/net/tcp is zero-touch.
    const hexPort = grpcPort.toString(16).toUpperCase().padStart(4, '0')
    const probe = await bchdSub.exec([
      'sh',
      '-c',
      `awk -v p=":${hexPort}" '$4=="0A" && $2 ~ p"$" {found=1} END{exit !found}' /proc/1/net/tcp /proc/1/net/tcp6`,
    ])
    return probe.exitCode === 0
  }

  // Per-index rebuild progress (logs only). When an index is toggled on it
  // rebuilds from genesis; BCHD logs a single AGGREGATE "INDX: Indexed N blocks
  // ... height H/Y (PP%)" line. We re-emit it labeled per-index, gated by the
  // store pending flags so a DISABLED index never prints (no phantom 0% spam).
  // Both indexes catch up in lockstep (same height), so when both are pending
  // the two lines correctly show the same %. Called from the primary daemon's
  // ready poll (which runs during the catch-up while RPC is down).
  let lastIndexLine = ''
  async function emitIndexRebuildProgress() {
    try {
      const s = await storeJson.read().once()
      const txPending = s?.txindexCatchupPending === true
      const adPending = s?.addrindexCatchupPending === true
      if (!txPending && !adPending) return // nothing rebuilding → silent
      const res = await bchdSub.exec([
        'sh',
        '-c',
        `f=$(ls -t /root/.bchd/logs/*/bchd.log "$HOME"/.bchd/logs/*/bchd.log 2>/dev/null | head -1); [ -n "$f" ] && grep -a Indexed "$f" | tail -1 || true`,
      ])
      if (res.exitCode !== 0) return
      const m = res.stdout.toString().match(/height \d+\/\d+ \([\d.]+%\)/)
      if (!m) return // no catch-up progress line yet
      const hy = m[0].replace(/^height /, '')
      if (hy === lastIndexLine) return // unchanged → don't repeat
      lastIndexLine = hy
      if (txPending)
        console.log(`[Index Rebuild] Transaction Index catch-up: ${hy}`)
      if (adPending)
        console.log(`[Index Rebuild] Address Index catch-up: ${hy}`)
    } catch {
      // never let log-emission break the health check
    }
  }

  const excludedByOnlynet = () => ({
    result: 'disabled' as const,
    message: 'Excluded by onlynet',
  })

  return sdk.Daemons.of(effects)
    .addOneshot('nocow', {
      subcontainer: null,
      exec: {
        fn: async () => {
          try {
            const mkdirRes = await bchdSub.exec(['mkdir', '-p', rootDir])
            if (mkdirRes.exitCode !== 0) {
              console.warn(
                `nocow: mkdir failed for ${rootDir}; continuing without chattr`,
              )
              return null
            }
            const chattrRes = await bchdSub.exec([
              'chattr',
              '-R',
              '+C',
              rootDir,
            ])
            if (chattrRes.exitCode !== 0) {
              console.warn(
                `nocow: chattr not applied for ${rootDir}; continuing startup`,
              )
            }
            // Generate TLS certs if missing (BCHD requires them for the P2P
            // listener even when --notls is set for RPC).
            await bchdSub.exec([
              'sh',
              '-c',
              `test -f ${rootDir}/rpc.cert || gencerts --directory=${rootDir} --force`,
            ])
            // Strip any legacy `externalip[]=` lines from bchd.conf. BCHD
            // rejects these at config parse; we now pass --externalip via CLI
            // from the list maintained in store.json by watchHosts.
            await bchdSub.exec([
              'sh',
              '-c',
              `test -f ${rootDir}/bchd.conf && sed -i '/^externalip\\[\\]=/d' ${rootDir}/bchd.conf || true`,
            ])
          } catch (err) {
            console.warn(
              'nocow: unable to set NoCOW attributes; continuing startup',
              err,
            )
          }
          return null
        },
      },
      requires: [],
    })
    .addDaemon('primary', {
      subcontainer: bchdSub,
      exec: {
        command: ['bchd', ...bchdArgs],
        sigtermTimeout: 300_000,
      },
      ready: {
        display: 'RPC',
        fn: async () => {
          // Emit per-index rebuild progress here: this ready poll runs repeatedly
          // during startup WHILE RPC is still down, which is exactly when an index
          // catch-up runs (bchd rebuilds indexes during chain init, before the RPC
          // server starts). The sync-progress health check can't see it because it
          // needs RPC. emitIndexRebuildProgress reads the log file (not RPC), so it
          // works here. No-op unless an index was just toggled on.
          await emitIndexRebuildProgress()
          try {
            const res = await rpc('getinfo')
            return res.exitCode === 0
              ? { message: 'BCHD RPC is ready', result: 'success' }
              : { message: 'BCHD RPC is starting...', result: 'starting' }
          } catch {
            return { message: 'BCHD RPC is starting...', result: 'starting' }
          }
        },
      },
      requires: ['nocow'],
    })
    .addOneshot('clear-index-pending', {
      subcontainer: null,
      exec: {
        // 'primary' is ready only once RPC responds, which BCHD does only AFTER
        // index catch-up completes (catch-up runs during startup before RPC).
        // So reaching here means any pending index rebuild is finished — clear
        // the flags so restarts don't re-announce a rebuild that already ran.
        fn: async () => {
          const currentStore = await storeJson.read().once()
          if (
            currentStore?.txindexCatchupPending ||
            currentStore?.addrindexCatchupPending
          ) {
            await storeJson.merge(effects, {
              txindexCatchupPending: false,
              addrindexCatchupPending: false,
            })
          }
          return null
        },
      },
      requires: ['primary'],
    })
    .addHealthCheck('sync-progress', {
      ready: {
        display: 'Blockchain Sync',
        fn: async () => {
          // (Per-index rebuild progress is emitted from the primary daemon's
          // ready poll, which runs during the catch-up while RPC is down.)

          // Mirrors the BCHN reference: read getblockchaininfo and use the node's
          // own initialblockdownload flag as the source of truth. BCHD omits
          // initialblockdownload (omitempty) when synced, so absent = synced.
          try {
            const res = await rpcWithRetry('getblockchaininfo')
            if (res.exitCode !== 0)
              return { message: 'Waiting for sync info', result: 'loading' }
            const info = JSON.parse(res.stdout.toString()) as {
              blocks: number
              initialblockdownload?: boolean
              verificationprogress?: number
              pruned?: boolean
            }
            if (info.initialblockdownload) {
              const pct = ((info.verificationprogress ?? 0) * 100).toFixed(2)
              return {
                message: `Syncing blocks... ${pct}% (${netLabel})`,
                result: 'loading',
              }
            }
            return {
              message: `Synced — block ${info.blocks}${info.pruned ? ' (pruned)' : ''} (${netLabel})`,
              result: 'success',
            }
          } catch {
            return { message: 'Waiting for sync info', result: 'loading' }
          }
        },
      },
      requires: ['primary'],
    })
    .addOneshot('synced-true', {
      subcontainer: null,
      exec: {
        fn: async () => {
          const currentStore = await storeJson.read().once()
          if (!currentStore?.fullySynced) {
            await storeJson.merge(effects, { fullySynced: true })
          }
          // Auto-disable fastsync once fully synced — BCHD silently ignores it
          // past the checkpoint anyway; clearing the flag keeps the UI honest.
          const currentConf = await bchdConf.read().once()
          if (currentConf?.fastsync) {
            await bchdConf.merge(effects, { fastsync: 0 })
            // Mark that fastsync was used on this data directory. Pre-checkpoint
            // blocks were never downloaded, so txindex is permanently unavailable
            // until chain data is deleted and the node re-syncs from genesis.
            await storeJson.merge(effects, { fastSyncUsed: true })
          }
          return null
        },
      },
      requires: ['sync-progress'],
    })
    .addHealthCheck('peer-connections', {
      ready: {
        display: 'Peer Connections',
        fn: async () => {
          // Mirrors the BCHN reference.
          try {
            const res = await rpcWithRetry('getpeerinfo')
            if (res.exitCode !== 0)
              return { message: 'Unable to query peers', result: 'loading' }
            const peers = JSON.parse(res.stdout.toString()) as Array<{
              inbound: boolean
            }>
            const count = peers.length
            if (count === 0)
              return {
                message: 'No peers connected — node may be starting up',
                result: 'loading',
              }
            if (count < 3)
              return {
                message: `Only ${count} peer(s) connected`,
                result: 'loading',
              }
            const inbound = peers.filter((p) => p.inbound).length
            return {
              message: `${count} peers (${count - inbound} outbound, ${inbound} inbound)`,
              result: 'success',
            }
          } catch {
            return { message: 'Unable to query peers', result: 'loading' }
          }
        },
      },
      requires: ['primary'],
    })
    .addHealthCheck('grpc', {
      ready: {
        display: 'gRPC',
        fn: async () => {
          if (!grpcEnabled) {
            return {
              result: 'disabled' as const,
              message:
                'gRPC API is disabled — enable grpclisten in Node Settings to use it',
            }
          }
          try {
            return (await grpcReady())
              ? {
                  result: 'success' as const,
                  message: `gRPC API is listening on port ${grpcPort}`,
                }
              : {
                  result: 'loading' as const,
                  message: 'gRPC API is starting up...',
                }
          } catch {
            return {
              result: 'loading' as const,
              message: 'gRPC API is starting up...',
            }
          }
        },
      },
      requires: ['primary'],
    })
    .addHealthCheck('tor', {
      ready: {
        display: 'Tor',
        fn: () => {
          if (onionOnly && !torEnabled)
            return {
              result: 'failure' as const,
              message:
                'Invalid config: onlynet=onion requires Tor routing enabled',
            }
          if (!torEnabled)
            return {
              result: 'disabled' as const,
              message: 'Tor proxy is disabled in config',
            }
          if (!torInstalled)
            return {
              result: 'disabled' as const,
              message: 'Tor is not installed',
            }
          if (!torRunning)
            return {
              result: 'disabled' as const,
              message: 'Tor is not running',
            }
          if (onlynetActive && !onlynetList.includes('onion'))
            return excludedByOnlynet()
          return {
            result: 'success' as const,
            message: externalip.some((ip) => ip.includes('.onion'))
              ? store?.torIsolation
                ? 'Tor proxy active with stream isolation — inbound and outbound connections'
                : 'Tor proxy active — inbound and outbound connections'
              : store?.torIsolation
                ? 'Tor proxy active with stream isolation — outbound only. Add an onion address to enable inbound.'
                : 'Tor proxy active — outbound only. Add an onion address to enable inbound.',
          }
        },
      },
      requires: [],
    })
    .addHealthCheck('i2p', {
      ready: {
        display: 'I2P',
        fn: () => ({
          result: 'disabled' as const,
          message: 'I2P support is not implemented yet.',
        }),
      },
      requires: [],
    })
    .addHealthCheck('clearnet', {
      ready: {
        display: 'Clearnet',
        fn: () => {
          if (
            onlynetActive &&
            !onlynetList.includes('ipv4') &&
            !onlynetList.includes('ipv6')
          )
            return excludedByOnlynet()
          return {
            result: 'success' as const,
            message: externalip.some((ip) => ip && !ip.includes('.onion'))
              ? 'Inbound and outbound connections'
              : 'Outbound only. Publish an IP address to enable inbound.',
          }
        },
      },
      requires: [],
    })
    .addDaemon('rpc-plaintext', {
      subcontainer: stunnelSub,
      exec: {
        command: [
          'sh',
          '-c',
          `{ echo 'foreground = yes'; echo 'pid ='; echo 'debug = 0'; echo 'output = /dev/null'; echo 'syslog = no'; echo ''; echo '[rpc-plaintext]'; echo 'client = yes'; echo 'accept = 0.0.0.0:${rpcPlaintextPort}'; echo 'connect = 127.0.0.1:${rpcPort}'; echo 'verify = 0'; } > /tmp/stunnel-rpc.conf && exec stunnel4 /tmp/stunnel-rpc.conf >/dev/null 2>&1`,
        ],
        sigtermTimeout: 5_000,
      },
      ready: {
        display: 'RPC Plaintext Proxy',
        fn: async () => {
          // Use /proc/net/tcp to check if stunnel is listening — avoids
          // opening a TCP connection to the TLS-terminating proxy which causes
          // Node.js to buffer the raw TLS handshake and exceed maxBuffer.
          const hexPort = rpcPlaintextPort
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')
          try {
            const probe = await stunnelSub.exec([
              'sh',
              '-c',
              `awk -v p=":${hexPort}" '$4=="0A" && $2 ~ p"$" {found=1} END{exit !found}' /proc/1/net/tcp /proc/1/net/tcp6 2>/dev/null`,
            ])
            return probe.exitCode === 0
              ? {
                  result: 'success' as const,
                  message: `Plaintext RPC proxy ready on port ${rpcPlaintextPort} (stunnel → BCHD TLS)`,
                }
              : {
                  result: 'starting' as const,
                  message: 'Plaintext RPC proxy starting...',
                }
          } catch {
            return {
              result: 'starting' as const,
              message: 'Plaintext RPC proxy starting...',
            }
          }
        },
      },
      requires: ['primary'],
    })
})
