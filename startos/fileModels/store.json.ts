import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const rpcCredentialShape = z.object({
  name: z.string(),
  username: z.string(),
  password: z.string(),
})

export type RpcCredential = z.infer<typeof rpcCredentialShape>

export const shape = z.object({
  rpcUser: z.string().catch('bchd'),
  rpcPassword: z.string().catch(''),
  rpcCredentials: z.array(rpcCredentialShape).catch([]),
  network: z
    .enum(['mainnet', 'testnet3', 'testnet4', 'chipnet', 'regtest'])
    .catch('mainnet'),
  fullySynced: z.boolean().catch(false),
  fastSyncUsed: z.boolean().catch(false),
  reindexBlockchain: z.boolean().catch(false),
  reindexChainstate: z.boolean().catch(false),
  torEnabled: z.boolean().catch(true),
  torIsolation: z.boolean().catch(false),
  pruneDepth: z.number().catch(0),
  advertiseClearnetInbound: z.boolean().catch(false),
  externalip: z.array(z.string()).catch([]),
  // Per-index catch-up tracking: set when an index transitions off→on so the
  // health check can label which index is rebuilding from genesis. Cleared when
  // the index is turned off or when BCHD reports "Indexes caught up".
  txindexCatchupPending: z.boolean().catch(false),
  addrindexCatchupPending: z.boolean().catch(false),
})

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: 'store.json',
  },
  shape,
)
