import { sdk } from '../sdk'
import { bchdConf, fullConfigSpec } from '../fileModels/bchd.conf'

export const mempoolSettings = sdk.Action.withInput(
  'mempool-settings',

  async ({ effects }) => ({
    name: 'Mempool & Block Policy',
    description:
      'Configure excessive block size and minimum relay fee. The mempool acts as an in-memory area for unconfirmed transactions; BCHD batches writes to its bolt database for efficient processing.',
    warning: null,
    allowedStatuses: 'any',
    group: 'Configuration',
    visibility: 'enabled',
  }),

  fullConfigSpec.filter({
    excessiveblocksize: true,
    minrelaytxfee: true,
  }),

  async ({ effects }) => {
    const conf = await bchdConf.read().once()
    return {
      excessiveblocksize: conf?.excessiveblocksize ?? 32000000,
      minrelaytxfee: conf?.minrelaytxfee ?? 0.00001,
    }
  },

  async ({ effects, input }) => {
    const patch: Parameters<typeof bchdConf.merge>[1] = {
      ...(input.excessiveblocksize != null ? { excessiveblocksize: input.excessiveblocksize } : {}),
      ...(input.minrelaytxfee != null ? { minrelaytxfee: input.minrelaytxfee } : {}),
    }
    if (Object.keys(patch).length) {
      await bchdConf.merge(effects, patch)
    }
    return null
  },
)
