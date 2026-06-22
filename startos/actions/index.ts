import { sdk } from '../sdk'
import { autoconfig } from './config/autoconfig'
import { runtimeInfo } from './runtimeInfo'
import { networkSettings } from './networkSettings'
import { nodeSettings } from './configure'
import { rpcPeersSettings } from './rpcPeersSettings'
import { mempoolSettings } from './mempoolSettings'
import { viewRpcCredentials } from './viewRpcCredentials'
import { generateRpcCredential } from './generateRpcCredential'
import { reindexChainstate } from './reindexChainstate'
import { deletePeers } from './deletePeers'
import { deleteTestNetworkData } from './deleteTestNetworkData'
import { deleteMainnetData } from './deleteMainnetData'

export const actions = sdk.Actions.of()
  // ── Hidden (cross-package) ──────────────────────────────────────────────────
  .addAction(autoconfig)
  // ── Info ────────────────────────────────────────────────────────────────────
  .addAction(runtimeInfo)
  // ── Configuration ───────────────────────────────────────────────────────────
  .addAction(networkSettings)
  .addAction(nodeSettings)
  .addAction(rpcPeersSettings)
  .addAction(mempoolSettings)
  // ── Credentials ─────────────────────────────────────────────────────────────
  .addAction(viewRpcCredentials)
  .addAction(generateRpcCredential)
  // ── Maintenance ─────────────────────────────────────────────────────────────
  .addAction(reindexChainstate)
  .addAction(deletePeers)
  .addAction(deleteTestNetworkData)
  .addAction(deleteMainnetData)
