import { sdk } from './sdk'

export const NETWORKS = [
  'mainnet',
  'testnet3',
  'testnet4',
  'chipnet',
  'regtest',
] as const
export type Network = (typeof NETWORKS)[number]

export const networkPorts: Record<
  Network,
  { rpc: number; peer: number; grpc: number }
> = {
  mainnet: { rpc: 8332, peer: 8333, grpc: 8335 },
  testnet3: { rpc: 18332, peer: 18333, grpc: 18335 },
  testnet4: { rpc: 28332, peer: 28333, grpc: 28335 },
  chipnet: { rpc: 48334, peer: 48333, grpc: 48335 },
  regtest: { rpc: 18444, peer: 18445, grpc: 18446 },
}

export const networkFlag: Record<Network, string | null> = {
  mainnet: null,
  testnet3: '--testnet',
  testnet4: '--testnet4',
  chipnet: '--chipnet',
  regtest: '--regtest',
}

export const rpcPort = networkPorts.mainnet.rpc
export const peerPort = networkPorts.mainnet.peer
export const grpcPort = networkPorts.mainnet.grpc
export const rpcPlaintextPort = 8334

// Host ids (the `sdk.MultiHost.of` groups) — distinct from the interface ids
// exported on them. Used for `sdk.host.getOwn` lookups.
export const rpcHostId = 'rpc'
export const peerHostId = 'peer'
export const grpcHostId = 'grpc'
export const rpcPlaintextHostId = 'rpc-plaintext'

export const rpcInterfaceId = 'rpc'
export const peerInterfaceId = 'peer'
export const grpcInterfaceId = 'grpc'
export const rpcPlaintextInterfaceId = 'rpc-plaintext'
export const rootDir = '/data'
