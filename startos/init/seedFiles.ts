import { utils } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { bchdConf } from '../fileModels/bchd.conf'
import { storeJson } from '../fileModels/store.json'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind === 'install') {
    await storeJson.merge(effects, { torEnabled: true, torIsolation: true })
    await bchdConf.merge(effects, { dbcachesize: 2048 })
  }
  if (!(await storeJson.read((s) => s.rpcPassword).once())) {
    await storeJson.merge(effects, {
      rpcUser: (await storeJson.read((s) => s.rpcUser).once()) ?? 'bchd',
      rpcPassword: utils.getDefaultString({
        charset: 'a-z,A-Z,0-9',
        len: 32,
      }),
    })
  }
})
