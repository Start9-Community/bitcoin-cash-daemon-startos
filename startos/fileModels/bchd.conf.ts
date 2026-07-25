import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const iniNumber = z.union([z.string().transform(Number), z.number()])

// INI values are read back as STRINGS, so a 0/1 flag stored as "0"/"1" never
// matches a numeric z.literal — it silently falls through to .catch(). Coerce
// string/number/boolean forms to a normalized 0 | 1 so flags can actually be
// turned OFF (e.g. addrindex=0). Consumers compare `=== 1`.
const ini01 = z.union([
  z.literal(0),
  z.literal(1),
  z.boolean().transform((b) => (b ? 1 : 0)),
  z.string().transform((s) => {
    const t = s.trim().toLowerCase()
    return t === '1' || t === 'true' ? 1 : 0
  }),
])
const iniStringArray = z
  .union([z.array(z.string()), z.string().transform((s) => [s])])
  .optional()
  .catch(undefined)

export const ONLYNET_VALUES = {
  ipv4: 'IPv4',
  ipv6: 'IPv6',
  onion: 'Tor (.onion)',
} as const
export type OnlynetKey = keyof typeof ONLYNET_VALUES
export const ALL_ONLYNETS = Object.keys(ONLYNET_VALUES) as OnlynetKey[]

export const shape = z.object({
  txindex: ini01.catch(1),
  addrindex: ini01.catch(0),
  fastsync: ini01.catch(0),
  rpcuser: z.string().catch('bchd'),
  rpcpass: z.string().catch(''),
  rpclisten: z.string().catch('0.0.0.0:8332'),
  listen: z.string().catch('0.0.0.0:8333'),
  grpclisten: z.string().catch('0.0.0.0:8335'),
  nocfilters: ini01.catch(0),
  nopeerbloomfilters: ini01.catch(0),
  dbcachesize: iniNumber.catch(450),
  utxocachemaxsize: iniNumber.catch(1024),
  dbflushinterval: iniNumber.catch(1800),
  maxpeers: iniNumber.catch(125),
  onlynet: iniStringArray,
  excessiveblocksize: iniNumber.catch(32000000),
  minrelaytxfee: z
    .union([z.string().transform(Number), z.number()])
    .catch(0.00001),
})

export const bchdConf = FileHelper.ini(
  {
    base: sdk.volumes.main,
    subpath: 'bchd.conf',
  },
  shape,
)

// Config spec for user-facing action and autoconfig
export const fullConfigSpec = sdk.InputSpec.of({
  txindex: sdk.Value.toggle({
    name: 'Transaction Index',
    description:
      'Build a full transaction index (look up any transaction by its txid). Required by Fulcrum and most block explorers. Light to build — kept in lockstep with block sync. Cannot be enabled with pruning or Fast Sync.',
    default: true,
  }),
  addrindex: sdk.Value.toggle({
    name: 'Address Index',
    description:
      'Build the address index so BCHD can answer "all transactions for an address" queries directly (gRPC getAddressTransactions, etc.). This is the slow part of initial sync (upstream bchd issue #219) and can turn a 1-2 day sync into weeks — leave it OFF unless a consumer queries addresses straight from BCHD. Fulcrum and most explorers build their own address index and do NOT need this. Requires Transaction Index. Enabling it later rebuilds the index from genesis (a one-time catch-up).',
    default: false,
  }),
  fastsync: sdk.Value.toggle({
    name: 'Fast Sync',
    description:
      'Skip downloading and processing all blocks before the latest hardcoded checkpoint. BCHD starts from the checkpoint UTXO state and only syncs forward from there, dramatically reducing initial sync time. If the node is already past the checkpoint, this flag is automatically ignored. Incompatible with Transaction Index and Address Index — enabling Fast Sync will automatically disable both.',
    warning:
      'PERMANENT: Once Fast Sync is used, Transaction Index is locked out for the lifetime of this data directory. Pre-checkpoint blocks are never downloaded and cannot be indexed retroactively. If you later need txindex (required by Fulcrum), you must run Maintenance → Delete Mainnet Data and re-sync from genesis.',
    default: false,
  }),
  prune: sdk.Value.number({
    name: 'Prune Depth',
    description:
      'Number of recent blocks to retain. 0 = disabled (keep full chain). Minimum 288 blocks when enabled. Incompatible with txindex.',
    required: false,
    default: 0,
    min: 0,
    max: null,
    integer: true,
    units: 'blocks',
    placeholder: '0 (disabled)',
    warning: 'Enabling pruning disables the transaction index.',
  }),
  grpcEnabled: sdk.Value.toggle({
    name: 'gRPC API',
    description:
      'Enable the gRPC API on port 8335. Provides modern API access and pub/sub notifications.',
    default: true,
  }),
  dbcachesize: sdk.Value.number({
    name: 'Database Cache (MiB)',
    description:
      'Size of the LevelDB block/raw database cache. Controls how aggressively BCHD buffers raw block and chain state writes before flushing to disk. On systems with 4 GB RAM or less, keep this at 450 MiB or lower to avoid swap thrashing during IBD.',
    required: true,
    default: 450,
    min: 64,
    max: 16384,
    integer: true,
    units: 'MiB',
  }),
  utxocachemaxsize: sdk.Value.number({
    name: 'UTXO Cache (MiB)',
    description:
      'Maximum RAM allocated to the in-memory UTXO set cache. Larger values eliminate UTXO disk I/O during IBD, which is one of the main sync bottlenecks. The BCH UTXO set is approximately 1–2 GiB; setting this to 2048 on a machine with 8+ GB RAM eliminates most UTXO I/O. BCHD default: 450 MiB.',
    required: true,
    default: 1024,
    min: 100,
    max: 16384,
    integer: true,
    units: 'MiB',
  }),
  dbflushinterval: sdk.Value.number({
    name: 'Database Flush Interval',
    description:
      'Seconds between database flushes. BCHD batches writes to its bolt key-value store for performance. Lower values flush more often (safer but slower), higher values batch more (faster but risk data on crash).',
    required: true,
    default: 1800,
    min: 60,
    max: 7200,
    integer: true,
    units: 'seconds',
    placeholder: '1800',
  }),
  maxpeers: sdk.Value.number({
    name: 'Max Peers',
    description: 'Maximum number of inbound and outbound peer connections.',
    required: true,
    default: 125,
    min: 0,
    max: 1000,
    integer: true,
    units: null,
  }),
  onlynet: sdk.Value.multiselect({
    name: 'Allowed Networks',
    description:
      'Restrict outbound peer connections to selected network types. Leave all selected to allow all networks.',
    default: ALL_ONLYNETS,
    values: ONLYNET_VALUES,
    minLength: 1,
    maxLength: null,
  }),
  onionOnly: sdk.Value.toggle({
    name: 'Onion-Only Mode',
    description:
      'Force peer connections to Tor only (equivalent to onlynet=onion). Disabled by default so Tor and clearnet can coexist.',
    default: false,
  }),
  peerbloomfilters: sdk.Value.toggle({
    name: 'Serve Bloom Filters (BIP37)',
    description:
      'Serve BIP37 bloom filters to peers. Useful for SPV wallets but can be a DoS vector on public-facing nodes. Disable if you do not need SPV wallet support.',
    default: true,
  }),
  cfindex: sdk.Value.toggle({
    name: 'Compact Block Filters (BIP 157/158)',
    description:
      'Build and serve compact block filters (Neutrino). Required by light wallets using the BIP 157/158 protocol.',
    default: true,
  }),
  torEnabled: sdk.Value.toggle({
    name: 'Tor Routing',
    description:
      'Route all outbound connections through the Tor network for enhanced privacy. ' +
      'Requires the Tor package to be installed and running. For faster IBD, Tor proxying is applied after initial sync.',
    default: true,
  }),
  torIsolation: sdk.Value.toggle({
    name: 'Tor Stream Isolation',
    description:
      'Use a separate Tor circuit for each peer connection (torisolation) when Tor proxying is active. Provides stronger privacy but causes aggressive peer churn during IBD — peers connect and drop in seconds, slowing sync significantly. Disable during Initial Block Download and re-enable after the node is fully synced.',
    default: false,
  }),
  advertiseClearnetInbound: sdk.Value.toggle({
    name: 'Advertise Clearnet Inbound',
    description:
      'Publish your public IPv4 and IPv6 clearnet endpoints for inbound peers. Respects the Allowed Networks setting — a network excluded by onlynet (or by Onion-Only Mode) is never advertised. Disabled by default for privacy.',
    default: false,
  }),
  excessiveblocksize: sdk.Value.number({
    name: 'Excessive Block Size',
    description:
      'Max accepted block size in bytes. BCHD default: 32000000 (32 MB).',
    required: false,
    default: null,
    min: 1000000,
    max: null,
    integer: true,
    units: 'bytes',
    placeholder: '32000000',
  }),
  minrelaytxfee: sdk.Value.number({
    name: 'Minimum Relay Fee',
    description: 'Minimum fee rate (BCH/kB) for relaying transactions.',
    required: false,
    default: null,
    min: 0,
    max: null,
    integer: false,
    units: 'BCH/kB',
    placeholder: '0.00001',
    step: 0.000001,
  }),
})
