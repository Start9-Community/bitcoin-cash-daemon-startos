import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { Network, NETWORKS, networkPorts } from '../utils'

export const viewRpcCredentials = sdk.Action.withoutInput(
  'view-rpc-credentials',

  async ({ effects }) => ({
    name: 'View RPC Credentials',
    description:
      'Display the RPC username, password, and port for connecting wallets, indexers, and dependent services.',
    warning: null,
    allowedStatuses: 'any',
    group: 'Credentials',
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const store = await storeJson.read().once()
    const cred = store?.rpcCredentials?.[0]
    const username = cred?.username ?? store?.rpcUser ?? 'bchd'
    const password = cred?.password ?? store?.rpcPassword ?? ''
    const network: Network = NETWORKS.includes(store?.network as Network)
      ? (store!.network as Network)
      : 'mainnet'
    const port = networkPorts[network].rpc

    return {
      version: '1' as const,
      title: 'RPC Credentials',
      message: [
        `**Username:** ${username}`,
        `**Password:** ${password}`,
        `**Port:** ${port}`,
      ].join('\n'),
      result: {
        type: 'single' as const,
        value: `${username}:${password}`,
        copyable: true,
        qr: false,
        masked: true,
      },
    }
  },
)
