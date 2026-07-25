import { sdk } from '../sdk'
import { rootDir } from '../utils'
import { storeJson } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

const deleteSpec = InputSpec.of({
  networks: Value.multiselect({
    name: 'Networks To Delete',
    description:
      'Delete all BCHD data for selected test networks. Mainnet is intentionally excluded and cannot be selected.',
    warning: null,
    default: [],
    values: {
      testnet3: 'Testnet3',
      testnet4: 'Testnet4',
      chipnet: 'Chipnet',
      regtest: 'Regtest',
    },
    minLength: 0,
    maxLength: null,
  }),
})

function pathsFor(network: 'testnet3' | 'testnet4' | 'chipnet' | 'regtest') {
  return [`${rootDir}/${network}`, `${rootDir}/logs/${network}`]
}

export const deleteTestNetworkData = sdk.Action.withInput(
  'delete-test-network-data',

  async () => ({
    name: 'Delete Test Network Data',
    description:
      'Delete all BCHD data for testnet3, chipnet and/or regtest. Mainnet data is never deleted by this action.',
    warning:
      'This permanently deletes selected test-network data, indexes, peers, and logs from disk.',
    allowedStatuses: 'any',
    group: 'Maintenance',
    visibility: 'enabled',
  }),

  deleteSpec,

  async () => ({
    networks: [] as Array<'testnet3' | 'testnet4' | 'chipnet' | 'regtest'>,
  }),

  async ({ effects, input }) => {
    const selected = ((input.networks as string[] | undefined) ?? []).filter(
      (n): n is 'testnet3' | 'testnet4' | 'chipnet' | 'regtest' =>
        n === 'testnet3' ||
        n === 'testnet4' ||
        n === 'chipnet' ||
        n === 'regtest',
    )

    if (selected.length === 0) {
      return {
        version: '1' as const,
        title: 'Nothing Selected',
        message: 'No test networks were selected for deletion.',
        result: null,
      }
    }

    const store = await storeJson.read().once()
    const active = store?.network ?? 'mainnet'
    if (
      selected.includes(
        active as 'testnet3' | 'testnet4' | 'chipnet' | 'regtest',
      )
    ) {
      return {
        version: '1' as const,
        title: 'Active Network Protected',
        message: `Cannot delete data for the currently active network (${active}). Switch back to mainnet first, then retry.`,
        result: null,
      }
    }

    const mounts = sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: rootDir,
      readonly: false,
    })

    const deletedPaths: string[] = []
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bchd' },
      mounts,
      'delete-test-network-data',
      async (sub) => {
        for (const net of selected) {
          for (const path of pathsFor(net)) {
            await sub.exec(['rm', '-rf', path])
            deletedPaths.push(path)
          }
        }
      },
    )

    return {
      version: '1' as const,
      title: 'Test Network Data Deleted',
      message: `Deleted data for ${selected.join(', ')}. Removed paths: ${deletedPaths.join(', ')}. Mainnet data was not touched.`,
      result: null,
    }
  },
)
