# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Package id is `bchd`.** BCHD is a Go-based Bitcoin Cash full node. The packaging is derived from Bitcoin Core's — `main.ts`, `interfaces.ts`, and `init/watchHosts.ts` mirror the `start9-registry/bitcoin-core` patterns; compare against that package when a construct is unclear.
- **Two subcontainers in `main.ts`:** `node-sub` (the `bchd` daemon) and `stunnel-sub` (a plaintext-RPC proxy sidecar for miners like asicseer-pool/ckpool that have no TLS library).
- **Four host interfaces are exported for dependents** (host/interface id constants live in `startos/utils.ts`): `rpc` (JSON-RPC over TLS, 8332), `rpc-plaintext` (plaintext RPC via stunnel, 8334), `grpc` (gRPC over TLS, 8335, conditional on `grpclisten`), and `peer` (P2P, 8333).
- **Tor is read at runtime, not via a StartOS binding.** Tor's SOCKS proxy has no host to import; `main.ts` targets it with `sdk.getContainerIp(effects, { packageId: 'tor' })` + `:9050`.

## Inspecting a running install

To run a command inside the service's container (read its generated config, grep app logs), use `start-cli package attach bchd -n node-sub -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts` — `node-sub` for the daemon, `stunnel-sub` for the proxy) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers".
