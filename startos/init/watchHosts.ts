import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { peerInterfaceId } from '../utils'

// Format a HostnameInfo as "host:port" (or "[v6]:port"). BCHD's --externalip
// flag accepts a bare address/port pair.
const toHostPort = (h: { hostname: string; port: number | null }): string => {
  const host = h.hostname.includes(':') ? `[${h.hostname}]` : h.hostname
  return h.port != null ? `${host}:${h.port}` : host
}

export const watchHosts = sdk.setupOnInit(async (effects) => {
  const store = await storeJson.read().const(effects)
  const advertiseClearnetInbound = !!store?.advertiseClearnetInbound
  const onionOnly = !!store?.onionOnly

  const publicInfo = await sdk.serviceInterface
    .getOwn(effects, peerInterfaceId, (i) =>
      i?.addressInfo?.public.filter({
        exclude: { kind: 'domain' },
      }),
    )
    .const()

  if (!publicInfo) return

  const externalip: string[] = []

  const onions = publicInfo
    .filter({
      predicate: ({ metadata }) =>
        metadata.kind === 'plugin' && metadata.packageId === 'tor',
    })
    .format('hostname-info')
    .map(toHostPort)
  externalip.push(...onions)

  // Onion-Only Mode routes everything through Tor — never advertise clearnet.
  if (advertiseClearnetInbound && !onionOnly) {
    const ipv4s = publicInfo
      .filter({ kind: 'ipv4' })
      .format('hostname-info')
      .map(toHostPort)
    const ipv6s = publicInfo
      .filter({ kind: 'ipv6' })
      .format('hostname-info')
      .map(toHostPort)
    externalip.push(...ipv4s, ...ipv6s)
  }

  await storeJson.merge(effects, { externalip })
})
