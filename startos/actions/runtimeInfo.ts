import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { Network, NETWORKS, networkPorts, rootDir } from '../utils'
import { mainMounts } from '../mounts'

type BchdInfo = {
  version?: number
  protocolversion?: number
  blocks?: number
  connections?: number
  proxy?: string
  difficulty?: number
  testnet?: boolean
  relayfee?: number
  errors?: string
}

type BchdBlockchainInfo = {
  blocks?: number
  headers?: number
  syncheight?: number
  verificationprogress?: number
  pruned?: boolean
}

type BchdPeer = { inbound: boolean }

export const runtimeInfo = sdk.Action.withoutInput(
  'runtime-info',
  async ({ effects: _effects }) => ({
    name: 'Node Info',
    description:
      'Display current node runtime information: version, network, connections, sync status.',
    warning: null,
    allowedStatuses: 'only-running' as const,
    group: null,
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    const store = await storeJson.read().once()
    const network: Network = NETWORKS.includes(store?.network as Network)
      ? (store!.network as Network)
      : 'mainnet'
    const { rpc: rpcPort } = networkPorts[network]
    const activeCred = store?.rpcCredentials?.[0]
    const rpcUser = activeCred?.username ?? store?.rpcUser ?? 'bchd'
    const rpcPassword = activeCred?.password ?? store?.rpcPassword ?? ''

    return sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bchd' },
      mainMounts,
      'runtime-info',
      async (sub) => {
        // bchd emits a self-signed TLS cert; rpc.cert may not exist yet.
        await sub.exec([
          'sh',
          '-c',
          `test -f ${rootDir}/rpc.cert || gencerts --directory=${rootDir} --force`,
        ])
        // BCHD's native RPC is TLS-only — the plaintext proxy daemon exists
        // precisely because of that — so `--notls` made every call here fail
        // with "client sent an HTTP request to an HTTPS server", leaving this
        // action to return its title and nothing else. The certificate is the
        // self-signed one generated just above.
        const cliBase = [
          'bchctl',
          `--rpcserver=127.0.0.1:${rpcPort}`,
          `--rpcuser=${rpcUser}`,
          `--rpcpass=${rpcPassword}`,
          `--rpccert=${rootDir}/rpc.cert`,
        ]

        const [infoRes, chainRes, peersRes] = await Promise.all([
          sub.exec([...cliBase, 'getinfo']).catch(() => null),
          sub.exec([...cliBase, 'getblockchaininfo']).catch(() => null),
          sub.exec([...cliBase, 'getpeerinfo']).catch(() => null),
        ])

        const info: BchdInfo | null =
          infoRes?.exitCode === 0 ? JSON.parse(infoRes.stdout.toString()) : null
        const chain: BchdBlockchainInfo | null =
          chainRes?.exitCode === 0
            ? JSON.parse(chainRes.stdout.toString())
            : null
        const peers: BchdPeer[] | null =
          peersRes?.exitCode === 0
            ? JSON.parse(peersRes.stdout.toString())
            : null

        const lines: string[] = []
        if (info) {
          lines.push(`Version: ${info.version ?? 'unknown'}`)
          lines.push(`Protocol: ${info.protocolversion ?? 'unknown'}`)
          if (info.relayfee != null)
            lines.push(`Relay Fee: ${info.relayfee} BCH/kB`)
        }
        if (peers) {
          const inbound = peers.filter((p) => p.inbound).length
          lines.push(
            `Connections: ${peers.length} (in: ${inbound}, out: ${peers.length - inbound})`,
          )
        } else if (info?.connections != null) {
          lines.push(`Connections: ${info.connections}`)
        }
        if (chain) {
          lines.push(
            `Chain: ${chain.pruned ? 'pruned' : 'archival'} ${network}`,
          )
          // `syncheight` is the best height BCHD has seen from its peers, and
          // `blocks` how far it has got. Not `headers`, which BCHD advances in
          // step with `blocks` — and not Core's `initialblockdownload`, which
          // BCHD does not publish at all, so testing it always read undefined
          // and reported Complete at every height.
          const blocks = chain.blocks ?? 0
          const target = chain.syncheight ?? 0
          const vp = chain.verificationprogress ?? 0
          lines.push(`Blocks: ${blocks} / ${target || (chain.headers ?? '?')}`)
          lines.push(
            `Sync: ${target > blocks ? `${(vp * 100).toFixed(2)}%` : 'Complete'}`,
          )
        }

        return {
          version: '1' as const,
          title: 'Node Runtime Info',
          message: null,
          result: {
            type: 'single' as const,
            value: lines.join('\n'),
            copyable: false,
            qr: false,
            masked: false,
          },
        }
      },
    )
  },
)
