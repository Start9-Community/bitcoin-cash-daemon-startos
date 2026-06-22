import { sdk } from '../sdk'
import { bchdConf } from '../fileModels/bchd.conf'
import { storeJson } from '../fileModels/store.json'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return

  // Generate a random RPC password on first install
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let password = ''
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  for (const b of bytes) {
    password += chars[b % chars.length]
  }

  await storeJson.merge(effects, {
    rpcUser: 'bchd',
    rpcPassword: password,
    rpcCredentials: [{ name: 'Default', username: 'bchd', password }],
    torEnabled: true,
    torIsolation: false,
  })

  // Seed bchd.conf with the schema's default values
  await bchdConf.merge(effects, {})
})
