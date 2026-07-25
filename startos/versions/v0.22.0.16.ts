import { VersionInfo } from '@start9labs/start-sdk'
import { bchdConf } from '../fileModels/bchd.conf'

export const v_0_22_0_16 = VersionInfo.of({
  version: '0.22.0:16',
  releaseNotes:
    'Fix slow IBD: reduce default database cache from 2048 MiB to 450 MiB. ' +
    'BCHD maintains a separate 450 MiB UTXO cache internally, so the old 2048 MiB LevelDB cache totalled ~2.5 GiB — causing swap thrashing on systems with 4 GB RAM or less. ' +
    "The new default (450 MiB) matches BCHD's native design. Users with high-RAM systems can increase the value in Node Settings.",
  migrations: {
    up: async ({ effects }) => {
      // Reset only when the value is exactly the old wrong default (2048).
      // Users who deliberately set a custom value are left alone.
      const conf = await bchdConf.read().once()
      if ((conf?.dbcachesize as number) === 2048) {
        await bchdConf.merge(effects, { dbcachesize: 450 })
      }
    },
    down: async ({ effects }) => {},
  },
})
