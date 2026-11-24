import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { NETWORKS } from '../utils'

// On the `public` volume, which dependent services mount read-only.
export const rpcJson = FileHelper.json(
  { base: sdk.volumes.public, subpath: '/rpc/rpc.json' },
  z.object({
    network: z.enum(NETWORKS),
    fullySynced: z.boolean(),
    rpcUser: z.string(),
    rpcPassword: z.string(),
  }),
)
