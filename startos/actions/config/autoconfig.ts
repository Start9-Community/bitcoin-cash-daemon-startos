import { z } from '@start9labs/start-sdk'
import {
  bchdConf,
  fullConfigSpec,
  shape as confShape,
} from '../../fileModels/bchd.conf'
import { shape as storeShape, storeJson } from '../../fileModels/store.json'
import { sdk } from '../../sdk'

export const autoconfig = sdk.Action.withInput(
  'autoconfig',

  async ({ effects }) => ({
    name: 'Auto-Configure',
    description:
      'Automatically configure BCHD for the needs of another service',
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'hidden',
  }),

  async ({ effects, prefill }) => {
    if (!prefill) return fullConfigSpec

    return fullConfigSpec
      .filterFromPartial(prefill as typeof fullConfigSpec._PARTIAL)
      .disableFromPartial(
        prefill as typeof fullConfigSpec._PARTIAL,
        'These fields were provided by a task and cannot be edited',
      )
  },

  async ({ effects }) => {
    const conf = await bchdConf.read().once()
    const store = await storeJson.read().once()
    return {
      txindex: conf?.txindex === 1,
      addrindex: conf?.txindex === 1 ? conf?.addrindex === 1 : false,
      prune: store?.pruneDepth ?? 0,
      grpcEnabled: (conf?.grpclisten ?? '') !== '',
      cfindex: conf?.nocfilters !== 1,
      dbcachesize: conf?.dbcachesize ?? 450,
      utxocachemaxsize: conf?.utxocachemaxsize ?? 1024,
      dbflushinterval: conf?.dbflushinterval ?? 1800,
      maxpeers: conf?.maxpeers ?? 125,
      onionOnly: store?.onionOnly ?? false,
      peerbloomfilters: conf?.nopeerbloomfilters !== 1,
      torEnabled: store?.torEnabled ?? true,
      torIsolation: store?.torIsolation ?? false,
      excessiveblocksize: conf?.excessiveblocksize ?? 32000000,
      minrelaytxfee: conf?.minrelaytxfee ?? 0.00001,
    }
  },

  async ({ effects, input }) => {
    // A task's form holds only the fields it sets; leave every other setting as it is.
    const conf = await bchdConf.read().once()
    const store = await storeJson.read().once()
    const confPatch: Partial<z.infer<typeof confShape>> = {}
    const storePatch: Partial<z.infer<typeof storeShape>> = {}

    const pruneDepth =
      input.prune === undefined
        ? (store?.pruneDepth ?? 0)
        : input.prune && input.prune > 0
          ? Math.max(input.prune, 288)
          : 0
    if (input.prune !== undefined) storePatch.pruneDepth = pruneDepth

    // BCHD refuses to start with txindex/addrindex alongside --prune or --fastsync.
    const fastsync = input.fastsync ?? conf?.fastsync === 1
    const fastSyncBlocked = fastsync || (store?.fastSyncUsed ?? false)
    const txindex =
      !fastSyncBlocked &&
      pruneDepth === 0 &&
      (input.txindex ?? conf?.txindex === 1)
    const addrindex = txindex && (input.addrindex ?? conf?.addrindex === 1)
    if (
      input.txindex !== undefined ||
      input.addrindex !== undefined ||
      input.prune !== undefined ||
      input.fastsync !== undefined
    ) {
      if (input.fastsync !== undefined) confPatch.fastsync = fastsync ? 1 : 0
      confPatch.txindex = txindex ? 1 : 0
      confPatch.addrindex = addrindex ? 1 : 0
      storePatch.txindexCatchupPending =
        txindex &&
        (conf?.txindex !== 1 || (store?.txindexCatchupPending ?? false))
      storePatch.addrindexCatchupPending =
        addrindex &&
        (conf?.addrindex !== 1 || (store?.addrindexCatchupPending ?? false))
    }

    if (input.grpcEnabled !== undefined)
      confPatch.grpclisten = input.grpcEnabled ? '0.0.0.0:8335' : ''
    if (input.cfindex !== undefined)
      confPatch.nocfilters = input.cfindex ? 0 : 1
    if (input.peerbloomfilters !== undefined)
      confPatch.nopeerbloomfilters = input.peerbloomfilters ? 0 : 1
    if (input.dbcachesize !== undefined)
      confPatch.dbcachesize = input.dbcachesize
    if (input.utxocachemaxsize !== undefined)
      confPatch.utxocachemaxsize = input.utxocachemaxsize
    if (input.dbflushinterval !== undefined)
      confPatch.dbflushinterval = input.dbflushinterval
    if (input.maxpeers !== undefined) confPatch.maxpeers = input.maxpeers
    if (input.excessiveblocksize != null)
      confPatch.excessiveblocksize = input.excessiveblocksize
    if (input.minrelaytxfee != null)
      confPatch.minrelaytxfee = input.minrelaytxfee

    if (input.onionOnly !== undefined) storePatch.onionOnly = input.onionOnly
    if (input.torEnabled !== undefined) storePatch.torEnabled = input.torEnabled
    if (input.torIsolation !== undefined)
      storePatch.torIsolation = input.torIsolation
    if (input.advertiseClearnetInbound !== undefined)
      storePatch.advertiseClearnetInbound = input.advertiseClearnetInbound

    await bchdConf.merge(effects, confPatch)
    await storeJson.merge(effects, storePatch)

    // main reads store.json once at start, so a change there needs a restart to apply.
    if (
      (
        [
          'pruneDepth',
          'onionOnly',
          'torEnabled',
          'torIsolation',
          'advertiseClearnetInbound',
        ] as const
      ).some((k) => k in storePatch && storePatch[k] !== store?.[k])
    )
      await effects.restart()

    if (input.txindex && !txindex && fastSyncBlocked)
      return {
        version: '1' as const,
        title: 'Transaction Index Unavailable',
        message:
          'Transaction Index cannot be turned on while Fast Sync is on, or on a data directory Fast Sync has been used on. Turn Fast Sync off in Node Settings; if it has already been used, also run Maintenance → Delete Mainnet Data and re-sync from genesis.',
        result: null,
      }
    return null
  },
)
