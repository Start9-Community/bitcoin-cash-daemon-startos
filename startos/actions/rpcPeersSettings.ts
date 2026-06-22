import { sdk } from '../sdk'
import { bchdConf, fullConfigSpec } from '../fileModels/bchd.conf'
import { storeJson } from '../fileModels/store.json'

export const rpcPeersSettings = sdk.Action.withInput(
  'rpc-peers-settings',

  async ({ effects }) => ({
    name: 'RPC & Peers Settings',
    description: 'Configure peer connections, bloom filters, compact block filters, and Tor proxy behavior.',
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

  async ({ effects }) => {
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

  async ({ effects, input }) => {
    await bchdConf.merge(effects, {
      maxpeers: input.maxpeers,
    })
    await storeJson.merge(effects, {
      onionOnly: input.onionOnly,
      advertiseClearnetInbound: input.advertiseClearnetInbound,
      torEnabled: input.torEnabled,
      torIsolation: input.torIsolation,
    })
    // main.ts reads torEnabled/torIsolation/onionOnly/advertiseClearnetInbound
    // from the store with .once() (only bchd.conf is .const-watched), so a Tor
    // toggle that doesn't also change bchd.conf would not restart — leaving the
    // --onion/--proxy args and the Tor health check stale. Restart so the change
    // always applies.
    await effects.restart()
    return null
  },
)
