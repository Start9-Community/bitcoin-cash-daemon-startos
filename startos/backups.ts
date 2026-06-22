import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(
  async () =>
    sdk.Backups.ofVolumes('main').setOptions({
      // BCHD stores all re-syncable data (blocks_ffldb, UTXO metadata, peers.json,
      // indexes) under a per-network subdirectory of the data dir. Exclude those so
      // backups capture only bchd.conf, store.json, and the rpc.cert / rpc.key.
      exclude: ['/mainnet', '/testnet3', '/testnet4', '/chipnet', '/regtest'],
    }),
)
