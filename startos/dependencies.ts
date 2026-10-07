import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'

const tor = sdk.Dependency.optional('tor', {
  description:
    'Lets BCHD connect to .onion peers, and accept them on an onion address, while Tor Routing is on.',
  metadata: {
    title: 'Tor',
    icon: 'https://raw.githubusercontent.com/Start9Labs/tor-startos/65faea17febc739d910e8c26ff4e61f6333487a8/icon.svg',
  },
  kind: 'running',
  versionRange: '>=0.4.9.11:2',
  healthChecks: [],
  enabled: async ({ effects }) =>
    (await storeJson.read((s) => s.torEnabled).const(effects)) ?? true,
})

export const dependencies = sdk.Dependencies.of().addDependency(tor)
