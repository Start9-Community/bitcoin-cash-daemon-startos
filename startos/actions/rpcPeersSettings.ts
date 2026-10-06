import { sdk } from '../sdk'
import { bchdConf, fullConfigSpec } from '../fileModels/bchd.conf'
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
    onionOnly: true,
    advertiseClearnetInbound: true,
    torEnabled: true,
    torIsolation: true,
  }),

  async ({ effects }: { effects: any }) => {
    const conf = await bchdConf.read().once()
    const store = await storeJson.read().once()
    return {
      maxpeers: conf?.maxpeers ?? 125,
      onionOnly: store?.onionOnly ?? false,
      advertiseClearnetInbound: store?.advertiseClearnetInbound ?? false,
      torEnabled: store?.torEnabled ?? true,
      torIsolation: store?.torIsolation ?? false,
    }
  },

  async ({ effects, input }: { effects: any; input: any }) => {
    await bchdConf.merge(effects, { maxpeers: input.maxpeers })
    await storeJson.merge(effects, {
      onionOnly: input.onionOnly,
      advertiseClearnetInbound: input.advertiseClearnetInbound,
      torEnabled: input.torEnabled,
      torIsolation: input.torIsolation,
    })
    // main.ts reads onionOnly/torEnabled/torIsolation/advertiseClearnetInbound from the
    // store with .once() (only bchd.conf is .const-watched), so a Tor toggle that
    // doesn't also change bchd.conf would not restart — leaving the --onion arg
    // and the Tor health check stale. Restart so the change always applies.
    // Mirrors the BCHN reindex-action pattern (merge, then effects.restart()).
    await effects.restart()
    return null
  },
)
