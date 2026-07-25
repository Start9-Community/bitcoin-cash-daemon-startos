import { sdk } from '../sdk'
import { bchdConf, fullConfigSpec } from '../fileModels/bchd.conf'
import { storeJson } from '../fileModels/store.json'

export const nodeSettings = sdk.Action.withInput(
  'node-settings',

  async ({ effects }) => ({
    name: 'Node Settings',
    description: 'Indexes, pruning, gRPC API, and database performance.',
    warning: null,
    allowedStatuses: 'any',
    group: 'Configuration',
    visibility: 'enabled',
  }),

  fullConfigSpec.filter({
    txindex: true,
    addrindex: true,
    fastsync: true,
    prune: true,
    grpcEnabled: true,
    peerbloomfilters: true,
    cfindex: true,
    dbcachesize: true,
    utxocachemaxsize: true,
    dbflushinterval: true,
  }),

  async ({ effects }) => {
    const conf = await bchdConf.read().once()
    const store = await storeJson.read().once()
    const fastSyncUsed = store?.fastSyncUsed ?? false
    const txindexOn = !fastSyncUsed && conf?.txindex === 1
    return {
      // Locked to false when fastSyncUsed: early blocks were never downloaded.
      txindex: fastSyncUsed ? false : conf?.txindex === 1,
      // addrindex only meaningful with txindex; show off when txindex is off.
      addrindex: txindexOn ? conf?.addrindex === 1 : false,
      fastsync: conf?.fastsync === 1,
      prune: store?.pruneDepth ?? 0,
      grpcEnabled: (conf?.grpclisten ?? '') !== '',
      peerbloomfilters: conf?.nopeerbloomfilters !== 1,
      cfindex: conf?.nocfilters !== 1,
      dbcachesize: conf?.dbcachesize ?? 450,
      utxocachemaxsize: conf?.utxocachemaxsize ?? 1024,
      dbflushinterval: conf?.dbflushinterval ?? 1800,
    }
  },

  async ({ effects, input }) => {
    const store = await storeJson.read().once()
    const conf = await bchdConf.read().once()
    const fastSyncUsed = store?.fastSyncUsed ?? false

    // fastsync and txindex/addrindex are mutually exclusive — mirroring upstream
    // BCHD which hard-exits if both flags are set. fastSyncUsed means early blocks
    // were never downloaded; enabling txindex would crash BCHD at startup.
    const fastsync = input.fastsync
    const txindex =
      fastSyncUsed || fastsync || (input.prune && input.prune > 0)
        ? false
        : input.txindex
    // addrindex requires txindex; it's the slow index (issue #219) so it is only
    // enabled when explicitly chosen alongside txindex.
    const addrindex = txindex ? !!input.addrindex : false

    // Per-index catch-up tracking (Part C): an off→on transition means BCHD will
    // rebuild that index from genesis on next start. Record which index so the
    // health check can label its progress; clear when the index is turned off.
    const prevTxindexOn = conf?.txindex === 1
    const prevAddrindexOn = conf?.addrindex === 1
    const txindexCatchupPending = !txindex
      ? false
      : !prevTxindexOn
        ? true
        : (store?.txindexCatchupPending ?? false)
    const addrindexCatchupPending = !addrindex
      ? false
      : !prevAddrindexOn
        ? true
        : (store?.addrindexCatchupPending ?? false)

    await bchdConf.merge(effects, {
      txindex: txindex ? 1 : 0,
      addrindex: addrindex ? 1 : 0,
      fastsync: fastsync ? 1 : 0,
      grpclisten: input.grpcEnabled ? '0.0.0.0:8335' : '',
      nopeerbloomfilters: input.peerbloomfilters ? 0 : 1,
      nocfilters: input.cfindex ? 0 : 1,
      dbcachesize: input.dbcachesize,
      utxocachemaxsize: input.utxocachemaxsize,
      dbflushinterval: input.dbflushinterval,
    })
    await storeJson.merge(effects, {
      pruneDepth:
        input.prune && input.prune > 0 ? Math.max(input.prune, 288) : 0,
      txindexCatchupPending,
      addrindexCatchupPending,
    })

    if (fastSyncUsed && input.txindex) {
      return {
        version: '1' as const,
        title: 'Transaction Index Unavailable',
        message:
          'Transaction Index cannot be enabled because Fast Sync was used during initial sync. ' +
          'Pre-checkpoint blocks were never downloaded and cannot be indexed. ' +
          'To use txindex: run Maintenance → Delete Mainnet Data, then re-sync from genesis with Fast Sync disabled.',
        result: null,
      }
    }
    return null
  },
)
