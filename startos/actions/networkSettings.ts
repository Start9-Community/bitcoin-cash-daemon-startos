import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { NETWORKS } from '../utils'

const { InputSpec, Value } = sdk

const networkSpec = InputSpec.of({
  network: Value.select({
    name: 'Chain Network',
    description:
      'Each network keeps its own data directory, so switching back finds its chain where it was left.\n- Mainnet: the real Bitcoin Cash network\n- Testnet3: the BCH test network\n- Testnet4: version 4 of the BCH test network\n- Chipnet: the network for testing upcoming upgrades\n- Regtest: a local, private test network with no peers',
    warning:
      'Mainnet data is preserved. Test network data stays on disk until you remove it with Delete Test Network Data.',
    values: {
      mainnet: 'Mainnet',
      testnet3: 'Testnet3 (BCH test network)',
      testnet4: 'Testnet4 (BCH test network v4)',
      chipnet: 'Chipnet (upgrade testing network)',
      regtest: 'Regtest (local/private testing network)',
    },
    default: 'mainnet',
  }),
})

export const networkSettings = sdk.Action.withInput(
  'network-settings',

  async () => ({
    name: 'Chain Network',
    description:
      'Select the BCH chain network for this node. RPC/P2P/gRPC ports are adjusted automatically for the selected network.',
    warning:
      'Changing network restarts BCHD immediately. The selected network may need a full sync if no prior data exists.',
    allowedStatuses: 'any',
    group: 'Configuration',
    visibility: 'enabled',
  }),

  networkSpec,

  async () => {
    const store = await storeJson.read().once()
    const current = store?.network
    return {
      network: NETWORKS.includes(current as (typeof NETWORKS)[number])
        ? current
        : 'mainnet',
    }
  },

  async ({ effects, input }) => {
    const store = await storeJson.read().once()
    const current = store?.network ?? 'mainnet'
    const next = input.network

    if (current === next) {
      return {
        version: '1' as const,
        title: 'Network Unchanged',
        message: `BCHD is already configured for ${next}.`,
        result: null,
      }
    }

    await storeJson.merge(effects, {
      network: next,
      fullySynced: false,
    })
    await effects.restart()

    return {
      version: '1' as const,
      title: 'Network Updated',
      message: `Switched BCHD from ${current} to ${next}. Restart triggered automatically.`,
      result: null,
    }
  },
)
