import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'

export const reindexChainstate = sdk.Action.withoutInput(
  'reindex-chainstate',
  async ({ effects: _effects }) => ({
    name: 'Reindex Chainstate',
    description:
      'Rebuild the UTXO chainstate from the existing block index without re-downloading blocks. Faster than a full reindex. Use this if the chainstate is corrupted but blocks are intact.',
    warning:
      'This rebuilds the chainstate database and can take several hours. BCHD will restart automatically.',
    allowedStatuses: 'any' as const,
    group: 'Maintenance',
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    await storeJson.merge(effects, {
      reindexChainstate: true,
      fullySynced: false,
    })
    await effects.restart()
    return {
      version: '1' as const,
      title: 'Chainstate Reindex Queued',
      message:
        'BCHD is restarting and will rebuild the UTXO chainstate from the existing block index. This can take several hours.',
      result: null,
    }
  },
)
