import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { Network, NETWORKS, networkPorts } from '../utils'

export const viewRpcCredentials = sdk.Action.withoutInput(
  'view-rpc-credentials',

  async ({ effects }) => ({
    name: 'View RPC Credentials',
    description:
      'Show the RPC username, password, and the RPC port of the network BCHD is running.',
    warning: null,
    allowedStatuses: 'any',
    group: 'Credentials',
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const store = await storeJson.read().once()
    const network: Network = NETWORKS.includes(store?.network as Network)
      ? (store!.network as Network)
      : 'mainnet'

    return {
      version: '1' as const,
      title: 'RPC Credentials',
      message: null,
      result: {
        type: 'group' as const,
        value: [
          {
            type: 'single' as const,
            name: 'Username',
            description: null,
            value: store?.rpcUser ?? 'bchd',
            copyable: true,
            qr: false,
            masked: false,
          },
          {
            type: 'single' as const,
            name: 'Password',
            description: null,
            value: store?.rpcPassword ?? '',
            copyable: true,
            qr: false,
            masked: true,
          },
          {
            type: 'single' as const,
            name: 'Port',
            description: null,
            value: String(networkPorts[network].rpc),
            copyable: true,
            qr: false,
            masked: false,
          },
        ],
      },
    }
  },
)
