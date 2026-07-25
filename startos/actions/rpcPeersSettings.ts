import { sdk } from '../sdk'
import {
  ALL_ONLYNETS,
  bchdConf,
  fullConfigSpec,
  OnlynetKey,
} from '../fileModels/bchd.conf'
import { storeJson } from '../fileModels/store.json'

export const rpcPeersSettings = sdk.Action.withInput(
  'rpc-peers-settings',

  async ({ effects }: { effects: any }) => ({
    name: 'RPC & Peers Settings',
    description:
      'Configure peer connections, bloom filters, compact block filters, and Tor proxy behavior.',
    warning: null,
    allowedStatuses: 'any',
    group: 'Configuration',
    visibility: 'enabled',
  }),

  fullConfigSpec.filter({
    maxpeers: true,
    onlynet: true,
    onionOnly: true,
    advertiseClearnetInbound: true,
    torEnabled: true,
    torIsolation: true,
  }),

  async ({ effects }: { effects: any }) => {
    const conf = await bchdConf.read().once()
    const store = await storeJson.read().once()
    const onlynetFromConf =
      (conf?.onlynet as string[] | undefined)?.filter(Boolean) ?? []
    const onlynet =
      onlynetFromConf.length > 0
        ? (onlynetFromConf as OnlynetKey[])
        : [...ALL_ONLYNETS]
    const onionOnly =
      onlynetFromConf.length > 0 && onlynetFromConf.every((n) => n === 'onion')

    return {
      maxpeers: conf?.maxpeers ?? 125,
      onlynet,
      onionOnly,
      advertiseClearnetInbound: store?.advertiseClearnetInbound ?? false,
      torEnabled: store?.torEnabled ?? true,
      torIsolation: store?.torIsolation ?? false,
    }
  },

  async ({ effects, input }: { effects: any; input: any }) => {
    const onlynetList =
      (input.onlynet as string[] | undefined)?.filter(Boolean) ?? []
    const allSelected = ALL_ONLYNETS.every((n) => onlynetList.includes(n))
    const writeOnlynet = input.onionOnly
      ? ['onion']
      : onlynetList.length > 0 && !allSelected
        ? onlynetList
        : undefined

    await bchdConf.merge(effects, {
      maxpeers: input.maxpeers,
      onlynet: writeOnlynet,
    })
    await storeJson.merge(effects, {
      advertiseClearnetInbound: input.advertiseClearnetInbound,
      torEnabled: input.torEnabled,
      torIsolation: input.torIsolation,
    })
    // main.ts reads torEnabled/torIsolation/advertiseClearnetInbound from the
    // store with .once() (only bchd.conf is .const-watched), so a Tor toggle that
    // doesn't also change bchd.conf would not restart — leaving the --onion arg
    // and the Tor health check stale. Restart so the change always applies.
    // Mirrors the BCHN reindex-action pattern (merge, then effects.restart()).
    await effects.restart()
    return null
  },
)
