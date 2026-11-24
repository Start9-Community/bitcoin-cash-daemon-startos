import { rpcJson } from '../fileModels/rpc.json'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const publishRpc = sdk.setupOnInit(async (effects) => {
  const rpc = await storeJson
    .read((s) => ({
      network: s.network,
      fullySynced: s.fullySynced,
      rpcUser: s.rpcUser,
      rpcPassword: s.rpcPassword,
    }))
    .const(effects)
  if (rpc) await rpcJson.merge(effects, rpc)
})
