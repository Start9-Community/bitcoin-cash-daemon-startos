import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { peerHostId, peerInterfaceId } from '../utils'

// Format a HostnameInfo as "host:port" (or "[v6]:port"). BCHD's --externalip
// flag accepts a bare address/port pair.
const toHostPort = (h: { hostname: string; port: number | null }): string => {
  const host = h.hostname.includes(':') ? `[${h.hostname}]` : h.hostname
  return h.port != null ? `${host}:${h.port}` : host
}

export const watchHosts = sdk.setupOnInit(async (effects) => {
  const store = await storeJson.read().const(effects)
  const advertiseClearnet =
    !!store?.advertiseClearnetInbound && !store?.onionOnly

  // One subscription on the peer host; the map fn walks the host to the peer
  // interface and returns just the advertised externalip list (onions + the
  // optional public IPv4/IPv6), so this re-runs only when that list changes
  // rather than on unrelated host churn.
  const externalip = await sdk.host
    .getOwn(effects, peerHostId, (host) => {
      const iface =
        host &&
        Object.values(host.bindings)
          .flatMap((b) => Object.values(b.interfaces))
          .find((i) => i.id === peerInterfaceId)
      if (!host || !iface) return undefined
      const publicInfo = iface.addressInfo.public.filter({
        exclude: { kind: 'domain' },
      })
      const list: string[] = []
      list.push(
        ...publicInfo
          .filter({
            predicate: ({ metadata }) =>
              metadata.kind === 'plugin' && metadata.packageId === 'tor',
          })
          .format('hostname-info')
          .map(toHostPort),
      )
      if (advertiseClearnet) {
        list.push(
          ...publicInfo
            .filter({ kind: 'ipv4' })
            .format('hostname-info')
            .map(toHostPort),
          ...publicInfo
            .filter({ kind: 'ipv6' })
            .format('hostname-info')
            .map(toHostPort),
        )
      }
      return list
    })
    .const()

  if (!externalip) return

  await storeJson.merge(effects, { externalip })
})
