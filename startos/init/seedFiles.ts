import { sdk } from '../sdk'
import { bchdConf } from '../fileModels/bchd.conf'
import { storeJson } from '../fileModels/store.json'

export const seedFiles = sdk.setupOnInit(async (effects) => {
  // Generate a random RPC password on first install
  const existing = await storeJson.read().once()
  if (!existing?.rpcPassword) {
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
      torIsolation: true,
    })
  } else if (!existing.rpcCredentials?.length) {
    // Migrate: existing install without rpcCredentials array
    await storeJson.merge(effects, {
      rpcCredentials: [
        {
          name: 'Default',
          username: existing.rpcUser ?? 'bchd',
          password: existing.rpcPassword,
        },
      ],
    })
  }

  // Seed default bchd.conf
  await bchdConf.merge(effects, { dbcachesize: 2048 })
})
