import {
  ALL_ONLYNETS,
  bchdConf,
  fullConfigSpec,
  OnlynetKey,
} from '../../fileModels/bchd.conf'
import { storeJson } from '../../fileModels/store.json'
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
    const onlynetFromConf =
      (conf?.onlynet as string[] | undefined)?.filter(Boolean) ?? []
    const onionOnly =
      onlynetFromConf.length > 0 && onlynetFromConf.every((n) => n === 'onion')
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
      onlynet:
        onlynetFromConf.length > 0
          ? (onlynetFromConf as OnlynetKey[])
          : [...ALL_ONLYNETS],
      onionOnly,
      peerbloomfilters: conf?.nopeerbloomfilters !== 1,
      torEnabled: store?.torEnabled ?? true,
      torIsolation: store?.torIsolation ?? false,
      excessiveblocksize: conf?.excessiveblocksize ?? 32000000,
      minrelaytxfee: conf?.minrelaytxfee ?? 0.00001,
    }
  },

  async ({ effects, input }) => {
    const {
      torEnabled,
      torIsolation,
      prune,
      txindex,
      addrindex,
      grpcEnabled,
      cfindex,
      onlynet,
      onionOnly,
      peerbloomfilters,
      dbcachesize,
      utxocachemaxsize,
      dbflushinterval,
      maxpeers,
      excessiveblocksize,
      minrelaytxfee,
    } = input as any
    const prevConf = await bchdConf.read().once()
    const prevStore = await storeJson.read().once()
    const onlynetList = (onlynet as string[] | undefined)?.filter(Boolean) ?? []
    const allSelected = ['ipv4', 'ipv6', 'onion'].every((n) =>
      onlynetList.includes(n),
    )
    const writeOnlynet = onionOnly
      ? ['onion']
      : onlynetList.length > 0 && !allSelected
        ? onlynetList
        : undefined
    // Prune/txindex interlock
    const effectiveTxindex = prune && prune > 0 ? false : (txindex ?? true)
    // addrindex requires txindex; default off.
    const effectiveAddrindex = effectiveTxindex ? !!addrindex : false
    const confPatch: Record<string, unknown> = {
      txindex: effectiveTxindex ? 1 : 0,
      addrindex: effectiveAddrindex ? 1 : 0,
      grpclisten: grpcEnabled ? '0.0.0.0:8335' : '',
      nocfilters: cfindex === false ? 1 : 0,
      onlynet: writeOnlynet,
      nopeerbloomfilters: peerbloomfilters === false ? 1 : 0,
      dbcachesize: dbcachesize ?? 450,
      utxocachemaxsize: utxocachemaxsize ?? 1024,
      dbflushinterval: dbflushinterval ?? 1800,
      maxpeers: maxpeers ?? 125,
    }
    if (excessiveblocksize != null)
      confPatch.excessiveblocksize = excessiveblocksize
    if (minrelaytxfee != null) confPatch.minrelaytxfee = minrelaytxfee
    // Per-index catch-up tracking (Part C): mark off→on transitions.
    const prevTxindexOn = prevConf?.txindex === 1
    const prevAddrindexOn = prevConf?.addrindex === 1
    const txindexCatchupPending = !effectiveTxindex
      ? false
      : !prevTxindexOn
        ? true
        : (prevStore?.txindexCatchupPending ?? false)
    const addrindexCatchupPending = !effectiveAddrindex
      ? false
      : !prevAddrindexOn
        ? true
        : (prevStore?.addrindexCatchupPending ?? false)
    await bchdConf.merge(effects, confPatch as any)
    await storeJson.merge(effects, {
      torEnabled: torEnabled ?? true,
      torIsolation: torIsolation ?? false,
      pruneDepth: prune && prune > 0 ? Math.max(prune, 288) : 0,
      txindexCatchupPending,
      addrindexCatchupPending,
    })
  },
)
