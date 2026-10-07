import { T } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { Network, NETWORKS, networkPorts, rootDir, mainMounts } from '../utils'

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
    const rpcUser = store?.rpcUser ?? 'bchd'
    const rpcPassword = store?.rpcPassword ?? ''

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
        // BCHD's native RPC is TLS-only, so `--notls` failed every call here
        // and the action returned an empty body. Cert is the one above.
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

        const single = (
          name: string,
          description: string | null,
          value: string,
        ): T.ActionResultMember => ({
          type: 'single',
          name,
          description,
          value,
          copyable: false,
          qr: false,
          masked: false,
        })

        const value: T.ActionResultMember[] = []
        if (info) {
          value.push(single('Version', null, String(info.version ?? 'unknown')))
          value.push(
            single('Protocol', null, String(info.protocolversion ?? 'unknown')),
          )
          if (info.relayfee != null)
            value.push(
              single(
                'Relay Fee',
                'The lowest fee rate this node relays transactions at',
                `${info.relayfee} BCH/kB`,
              ),
            )
        }
        if (peers) {
          const inbound = peers.filter((p) => p.inbound).length
          value.push(
            single(
              'Connections',
              'Peers connected, inbound and outbound',
              `${peers.length} (in: ${inbound}, out: ${peers.length - inbound})`,
            ),
          )
        } else if (info?.connections != null) {
          value.push(
            single(
              'Connections',
              'Peers connected, inbound and outbound',
              String(info.connections),
            ),
          )
        }
        if (chain) {
          value.push(
            single(
              'Chain',
              null,
              `${chain.pruned ? 'pruned' : 'archival'} ${network}`,
            ),
          )
          // `syncheight` is the best height BCHD's peers have offered. Not
          // `headers`, which it advances in step with `blocks`, and not
          // `initialblockdownload`, which BCHD does not publish.
          const blocks = chain.blocks ?? 0
          const target = chain.syncheight ?? 0
          const vp = chain.verificationprogress ?? 0
          value.push(
            single(
              'Blocks',
              'Blocks verified, out of the best height peers have offered',
              `${blocks} / ${target || (chain.headers ?? '?')}`,
            ),
          )
          value.push(
            single(
              'Sync',
              null,
              target > blocks ? `${(vp * 100).toFixed(2)}%` : 'Complete',
            ),
          )
        }

        return {
          version: '1' as const,
          title: 'Node Runtime Info',
          message: value.length
            ? null
            : 'BCHD did not answer over RPC. Try again once its RPC health check passes.',
          result: { type: 'group' as const, value },
        }
      },
    )
  },
)
