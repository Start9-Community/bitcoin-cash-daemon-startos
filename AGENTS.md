# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (technical reference for an AI support or administering agent) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **The packaging is derived from Bitcoin Core's.** `main.ts`, `interfaces.ts`, and `init/watchHosts.ts` mirror `start9-registry/bitcoin-core`; compare against that package when a construct here is unclear.
- **Don't declare the RPC or gRPC binds as `protocol: 'http'`.** BCHD terminates TLS itself on both, so an HTTP declaration makes the StartOS reverse proxy probe the backend every ~30s — endless `TLS handshake error … EOF` in the logs, and broken gRPC forwarding. Both are declared as pass-through TLS (`secure: { ssl: true }`, `protocol: null`).
- **Don't probe a TLS port by opening a socket.** The gRPC and stunnel checks read LISTEN state out of `/proc/1/net/tcp{,6}` precisely because `nc -z` and friends complete a TCP handshake and drop it, which the Go server logs as a failed TLS handshake on every poll.
- **INI values read back as strings.** `ini01` in `fileModels/bchd.conf.ts` coerces `"0"`/`"1"`/`"true"` to a numeric `0 | 1`; without it a `z.literal(0)` never matches and a flag cannot be turned off. Compare with `=== 1`, and keep new flags going through `ini01`.
- **Tor's SOCKS proxy is reached over the service bridge with a `9050` fallback.** Tor exports no interface, and the fallback holds the address constant while Tor is absent, so the `.const()` doesn't restart the node on Tor install/uninstall. A dead bridge address is just connection-refused, which is why the Tor flags are safe to pass unconditionally.
- **The stunnel sidecar is temporary by design.** It exists because ckpool-lineage miners (asicseer-pool, ckpool) have no TLS library. When upstream gains TLS, remove the daemon and the `rpc-plaintext` interface in one commit — the miner packages need no change.
- **`--rpcmaxclients=50` is deliberate.** BCHD defaults to 10, and the health checks plus a consumer can exceed that during sync while slow chain-locked calls are in flight, rejecting calls with "Max RPC clients exceeded".
- **`TARGETOS`/`TARGETARCH` are redeclared in the `Dockerfile` without defaults on purpose.** Giving a predefined build arg a default shadows what buildx injects, which would pin every target to one architecture.
