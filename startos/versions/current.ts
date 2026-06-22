import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.22.0:25',
  releaseNotes: {
    en_US:
      'BCHD on StartOS — a Go-based Bitcoin Cash full node. Provides a JSON-RPC API over TLS, ' +
      'an optional gRPC API with compact block filters (BIP 157/158) and pub/sub notifications, ' +
      'full transaction and address indexes, configurable pruning and Fast Sync, and optional ' +
      'Tor routing for private peer connections.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
