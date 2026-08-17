<p align="center">
  <img src="assets/bchd-logo.svg" alt="BCHD Logo" width="21%">
</p>

# Bitcoin Cash Daemon on StartOS

> Everything not listed in this document should behave the same as upstream
> BCHD. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation
> section of `instructions.md` for links.

[BCHD](https://github.com/gcash/bchd) is a full-node implementation of the Bitcoin Cash protocol written in Go, with JSON-RPC, a gRPC API with pub/sub, BIP 157/158 compact block filters, and BIP 37 bloom filters. This package builds it from source, runs it on any of five BCH networks, and adds a plaintext RPC proxy for mining software that cannot speak TLS.

- **Upstream repo:** <https://github.com/gcash/bchd>
- **Wrapper repo:** <https://github.com/Start9-Community/bitcoin-cash-daemon-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One image, built here from upstream source. Because BCHD is pure Go, the build cross-compiles natively for every target rather than emulating one — which is why this package can offer riscv64 where most cannot.

| Property      | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| Image         | Built from this repo's `Dockerfile`                               |
| Architectures | x86_64, aarch64, riscv64                                          |
| Command       | `bchd`, with every setting passed as a flag rather than inherited |

| Subcontainer  | Purpose                                                              |
| ------------- | -------------------------------------------------------------------- |
| `node-sub`    | The `bchd` daemon — the one to `attach` to, and where `bchctl` lives |
| `stunnel-sub` | The plaintext RPC proxy                                              |

The image also ships `bchctl` and `gencerts`, which the package uses for its health checks and for generating the node's TLS certificate.

**Almost nothing is read from the config file at run time.** `bchd.conf` is where settings are _stored_, but `main.ts` reads it and passes the result as command-line flags, so the effective configuration is always what the package assembled at start — not whatever a hand edit put in the file.

## Volume and Data Layout

One volume, holding the chain and everything else.

| Volume | Mount Point | Purpose                                                        |
| ------ | ----------- | -------------------------------------------------------------- |
| `main` | `/data`     | Blockchain, chainstate, indexes, config, credentials, TLS keys |

| Path                       | Written by                 | Holds                                      |
| -------------------------- | -------------------------- | ------------------------------------------ |
| `bchd.conf`                | The package                | Node configuration                         |
| `store.json`               | The package                | Package state: network, credentials, flags |
| `rpc.cert` / `rpc.key`     | `gencerts`, on first start | The node's self-signed TLS certificate     |
| `mainnet/`, `testnet3/`, … | BCHD                       | One data directory per network             |
| `logs/<network>/`          | BCHD                       | The node's own logs                        |

**Each network keeps its own directory**, so switching networks does not destroy the chain you already have — mainnet data survives a trip to chipnet and back.

The volume is marked NoCOW (`chattr +C`) on first start. That matters on btrfs, where copy-on-write plus a blockchain's sequential append pattern fragments the filesystem badly. It is applied best-effort: a filesystem that does not support it logs a warning and start-up continues.

## File Models

Two models, and the division between them is not arbitrary: `bchd.conf` holds what upstream considers configuration, `store.json` holds what only StartOS knows.

| File         | Format | Modelled                | Written by                  |
| ------------ | ------ | ----------------------- | --------------------------- |
| `bchd.conf`  | INI    | Yes — `FileHelper.ini`  | Init and the config actions |
| `store.json` | JSON   | Yes — `FileHelper.json` | Init, actions, and `main`   |

**`bchd.conf`** carries the index toggles, cache sizes, peer limits, filter settings, and relay policy. A hand edit is not rejected, but it is not authoritative either: the package re-reads the file each start and translates it into flags, and any action that touches a setting rewrites its key.

INI values come back as **strings**, which the model normalizes: `"0"`/`"1"`/`"true"` all coerce to a numeric `0`/`1`. Without that, a flag set to `0` would fail a numeric comparison and silently fall through to its default — meaning a setting could not be turned off at all.

**`store.json`** carries what has no place in BCHD's own config: the selected network, the named RPC credential list, the Tor preferences, the prune depth, the advertised external addresses, and several one-shot flags (`reindexChainstate`, `fastSyncUsed`, the per-index catch-up markers). `main` clears the reindex flag as it consumes it, so a reindex happens once rather than on every start.

`rpc.cert` and `rpc.key` are generated, not modelled. They are created on first start only if absent, so they persist across restarts and travel in the backup — a client that pinned the certificate keeps working.

**Legacy `externalip[]=` lines are stripped from `bchd.conf` at every start.** BCHD rejects them at config-parse time; external addresses are passed as flags from `store.json` instead. This is repair of an older layout, not a live feature.

## Dependencies

Tor, and **only while Tor routing is enabled**.

| Setting                  | Tor dependency              |
| ------------------------ | --------------------------- |
| Tor Routing on (default) | Required, `kind: 'running'` |
| Tor Routing off          | Not a dependency at all     |

Tor exports no interface of its own, so the package resolves its SOCKS proxy over the internal bridge, with a fallback that keeps the address stable while Tor is absent or restarting. That fallback is what makes it safe to pass the Tor flags unconditionally: an unreachable proxy is a refused connection, not a start-up failure.

The Tor **health check** tracks install and run state live, so installing or stopping Tor changes what the check reports without restarting the node.

## Network Access and Interfaces

Four interfaces, and their ports move with the selected network.

| Interface           | Id              | Type | Mainnet Port | Description                                     |
| ------------------- | --------------- | ---- | ------------ | ----------------------------------------------- |
| RPC Interface       | `rpc`           | api  | 8332         | JSON-RPC over TLS                               |
| Peer Interface      | `peer`          | p2p  | 8333         | The Bitcoin Cash P2P network                    |
| RPC Plaintext Proxy | `rpc-plaintext` | api  | 8334         | JSON-RPC without TLS, for miners                |
| gRPC Interface      | `grpc`          | api  | 8335         | Compact filters and pub/sub — only when enabled |

| Network  | RPC   | Peer  | gRPC  |
| -------- | ----- | ----- | ----- |
| mainnet  | 8332  | 8333  | 8335  |
| testnet3 | 18332 | 18333 | 18335 |
| testnet4 | 28332 | 28333 | 28335 |
| chipnet  | 48334 | 48333 | 48335 |
| regtest  | 18444 | 18445 | 18446 |

The plaintext proxy's port does **not** move with the network; it is always 8334.

**RPC and gRPC are declared as pass-through TLS**, not as HTTP. BCHD terminates TLS itself with its own self-signed certificate, and StartOS forwards raw TLS to it rather than proxying HTTP. Declaring them as HTTP made the reverse proxy probe the backend every half minute, filling the log with handshake errors and breaking gRPC forwarding outright. A client must therefore trust the self-signed certificate or skip verification.

**The plaintext proxy exists for one reason.** ckpool-lineage mining software — asicseer-pool, ckpool — has no TLS library at all and can only speak plain HTTP JSON-RPC. The proxy accepts plaintext and forwards it to BCHD's TLS RPC over loopback inside the service, so TLS is never actually absent on BCHD's side; it just terminates one hop earlier. When upstream miners gain TLS, this daemon and its interface go away together.

The gRPC interface is exported only when gRPC is enabled, so its absence from the address list is a configuration state rather than a fault.

## Installation and First-Run Flow

Install seeds `bchd.conf`, generates a random RPC credential named **Default**, and turns Tor routing on. There is no task and no wizard; the node starts syncing mainnet immediately.

Start-up runs a oneshot first: it creates the data directory, applies the NoCOW attribute, generates the TLS certificate if it is missing, and strips any legacy external-IP lines. The node then starts, followed by the plaintext proxy.

**Initial sync is the long part**, and two settings decide how long. The defaults — transaction index on, Fast Sync off — give a complete, useful node that takes a day or two on mainnet. The alternatives are covered under [Actions](#actions), and one of them is irreversible.

Once the sync completes, the package records it and turns Fast Sync off if it was on.

## Actions

Thirteen actions in four groups, plus one hidden. The ones that matter most are in **Node Settings**, because two of its toggles have permanent consequences.

### Node Info — ungrouped

Reports version, network, peer count, and sync progress from the running node. Read-only, `only-running`, immediate.

### Chain Network — Configuration

Switches which BCH network the node runs: mainnet, testnet3, testnet4, chipnet, or regtest.

- **What it changes:** `network` in the store, and with it every interface's port and the data directory in use.
- **Cost:** **restarts immediately**, and the newly selected network syncs from scratch if it has no prior data.
- **Repeat safety:** idempotent, and a no-op when the selection is unchanged. Existing data for other networks is preserved, not deleted.

### Node Settings — Configuration

Indexes, pruning, Fast Sync, gRPC, filters, and cache sizes.

- **What it changes:** most of `bchd.conf`, plus `pruneDepth` and the index catch-up markers in the store.
- **Cost:** applies on the next start. Turning an index **on** makes the next start rebuild it from genesis before the RPC server comes up, which can take a long time and is not interruptible.
- **Repeat safety:** idempotent — except that Fast Sync is not, see below.

Three constraints are enforced here rather than left to fail at run time, because BCHD hard-exits on the conflicting combinations:

- **Address Index requires Transaction Index**, and is the slow one. It can turn a two-day sync into weeks. Most consumers, including Fulcrum and typical explorers, build their own address index and do not need it.
- **Pruning forces both indexes off.**
- **Fast Sync forces both indexes off, and is permanent.** It skips every block before the latest checkpoint, so those blocks are never downloaded and cannot be indexed afterwards. Once it has been used on a data directory, Transaction Index is locked out for the life of that directory — the action will refuse to enable it and say so. The only way back is Delete Mainnet Data and a full re-sync.

### RPC & Peers Settings — Configuration

Peer limits, allowed networks, onion-only mode, Tor routing, Tor stream isolation, and whether to advertise clearnet inbound addresses.

- **What it changes:** `maxpeers` and `onlynet` in `bchd.conf`; the Tor and advertise flags in the store.
- **Cost:** **restarts unconditionally**, even if nothing changed. The Tor flags live in the store, which `main` reads without watching, so a restart is the only thing that makes a Tor toggle take effect instead of leaving the running node's flags stale.
- **Repeat safety:** idempotent.
- **Worth knowing:** stream isolation gives a fresh circuit per peer, and causes aggressive peer churn during initial sync. It is off by default for that reason. Advertising clearnet inbound is also off by default, and respects the allowed-networks setting — an excluded network is never advertised.

### Mempool & Block Policy — Configuration

Excessive block size and minimum relay fee. Writes `bchd.conf` only, and does not restart; the values apply on the next start.

### Credentials — three actions

**View RPC Credentials** shows a stored credential's username, password, and port. **Generate RPC Credential** creates a new named one with a random password. **Delete RPC Credentials** removes one or more by name.

- **The first credential in the list is the active one** — it is what the node actually authenticates with and what the health checks use. Generating a credential does not make it active, and deleting the first one changes which credential the node uses on its next start.
- All three are available at any status and write only the store.
- Deletion is permanent and has no undo.

### Maintenance — four actions

| Action                   | Availability   | What it does                                              |
| ------------------------ | -------------- | --------------------------------------------------------- |
| Reindex Chainstate       | any            | Rebuilds the UTXO set from existing blocks, then restarts |
| Delete Peer List         | `only-stopped` | Removes the cached peer addresses                         |
| Delete Test Network Data | any            | Deletes data for selected test networks                   |
| Delete Mainnet Data      | any            | Deletes the entire mainnet data directory                 |

- **Reindex Chainstate** sets a one-shot flag and restarts. It rebuilds only the UTXO set, not the block index, so it is much faster than a full re-download — hours rather than days — and is the right response to a corrupted chainstate with intact blocks. The flag is cleared as it is consumed, so it does not repeat.
- **Delete Peer List** requires the service stopped, and the node rediscovers peers from DNS seeds on the next start. Expect a few minutes with no peers afterwards.
- **Delete Test Network Data** takes a multiselect and **refuses to delete the network currently in use**, telling you to switch away first. Mainnet is not offered.
- **Delete Mainnet Data** requires an explicit confirmation toggle and deletes the whole mainnet directory. Configuration and credentials survive. It also clears the Fast Sync marker, which is its real purpose: it is the only way to make Transaction Index available again after Fast Sync has been used.

### Auto-Configure — hidden

**Not user-facing.** It exists so a dependent package — Fulcrum, an explorer, a mining pool — can raise a task that sets exactly the BCHD settings it needs, with those fields pre-filled and locked. A support agent should never tell a user to go find it; they will encounter it as a task on this service's page, raised by another.

## Tasks

None. This package raises no tasks, so the service is never held on a prompt and its ordinary controls are always available.

## Health Checks

Eight checks. Three probe the node, and five report on state that would otherwise be invisible.

| Check              | Displayed as          | Method                                         |
| ------------------ | --------------------- | ---------------------------------------------- |
| `primary`          | "RPC"                 | `bchctl getinfo` succeeds                      |
| `sync-progress`    | "Blockchain Sync"     | `getblockchaininfo`, comparing height to peers |
| `peer-connections` | "Peer Connections"    | `getpeerinfo`, counting inbound and outbound   |
| `grpc`             | "gRPC"                | The gRPC port is in LISTEN state               |
| `rpc-plaintext`    | "RPC Plaintext Proxy" | The proxy port is in LISTEN state              |
| `tor`              | "Tor"                 | Configuration plus Tor's live package status   |
| `clearnet`         | "Clearnet"            | Allowed networks plus advertised addresses     |
| `i2p`              | "I2P"                 | Always disabled — not implemented              |

**"Blockchain Sync" compares against `syncheight`, not `initialblockdownload`.** BCHD does not publish the latter, and reading it returned undefined — which made the node report Synced at any height. It also cannot use `headers`, because BCHD advances that in lockstep with `blocks`. A node with no peers reports `syncheight` 0, which is treated as "no information" rather than as being caught up; regtest is permanently in that state.

**The gRPC and plaintext-proxy checks read `/proc` rather than opening a socket.** Both ports are TLS-terminating, and a bare TCP probe that connects and closes without a handshake makes the server log a handshake error every poll. Reading the kernel's socket table is zero-touch.

**"Peer Connections" reports `loading`, not failure, below three peers.** A node that has just started legitimately has none.

**"Tor" reports the specific reason it is not active** — disabled in config, not installed, not running, or excluded by the allowed-networks setting — and distinguishes outbound-only from inbound-and-outbound by whether an onion address is being advertised. It also flags one invalid combination outright: onion-only peer connections with Tor routing switched off.

"Clearnet" makes the same outbound-only distinction, based on whether a public address is advertised.

**Index rebuild progress appears in the logs, not in a check.** BCHD logs one aggregate line covering all indexes, so the package re-emits it labelled per index while a rebuild is pending. It comes from the RPC readiness poll rather than from the sync check, because an index rebuild happens _before_ the RPC server starts — which is exactly when the sync check cannot run.

## Backups and Restore

The `main` volume is copied, with three exclusions:

| Excluded      | Why                                            |
| ------------- | ---------------------------------------------- |
| `/blocks`     | Re-downloadable from the network, and enormous |
| `/chainstate` | Derived from blocks                            |
| `/peers.json` | Rediscovered from DNS seeds                    |

So the backup is the **configuration**, not the chain: `bchd.conf`, `store.json` with its credentials and network selection, and the TLS certificate and key.

**A restored node re-syncs from scratch.** That is the deliberate trade — a backup measured in kilobytes instead of hundreds of gigabytes, at the cost of a full initial sync after a restore. Anything depending on this node's RPC will be unusable until that sync completes.

The TLS certificate surviving is what stops a restore from breaking clients that pinned it, and the credential list surviving is what stops dependent packages from needing reconfiguration.

## Limitations and Differences

1. **No Double Spend Proof.** BCHD does not implement DSP relay. Mining operations that need it want Bitcoin Cash Node or Flowee instead.
2. **Fast Sync is a one-way door.** Using it permanently prevents the Transaction Index on that data directory; recovering means deleting all mainnet data and re-syncing.
3. **The Address Index is impractically slow.** It is off by default and should stay off unless something queries addresses from BCHD directly.
4. **RPC and gRPC use a self-signed certificate.** Clients must trust it or skip verification.
5. **The plaintext RPC proxy is a StartOS-only workaround** for mining software with no TLS support, and will be removed when upstream no longer needs it.
6. **Blockchain data is not backed up**, by design.
7. **I2P is not implemented.** The health check reports it as permanently disabled.
8. **`bchd.conf` is not the live configuration.** The package translates it into flags at start, so hand edits are subordinate to what the actions write.

---

## Quick Reference for AI Consumers

```yaml
package_id: bchd
image: built from ./Dockerfile # bchd cross-compiled from upstream Go source
architectures:
  - x86_64
  - aarch64
  - riscv64
subcontainers:
  - node-sub # the bchd daemon
  - stunnel-sub # the plaintext RPC proxy
volumes:
  main: /data
file_models:
  - bchd.conf
  - store.json
  # rpc.cert / rpc.key are generated on first start, not modelled
startos_managed_env_vars: [] # every setting is passed as a bchd flag
dependencies:
  - tor # required only while Tor routing is enabled; kind: running
interfaces:
  rpc: { type: api, port: 8332 } # TLS pass-through
  peer: { type: p2p, port: 8333 }
  rpc-plaintext: { type: api, port: 8334 } # always 8334, all networks
  grpc: { type: api, port: 8335 } # exported only when gRPC is enabled
actions:
  - runtime-info
  - network-settings
  - node-settings
  - rpc-peers-settings
  - mempool-settings
  - view-rpc-credentials
  - generate-rpc-credential
  - delete-rpc-credentials
  - reindex-chainstate
  - delete-peers
  - delete-test-network-data
  - delete-mainnet-data
  - autoconfig # hidden; called by dependent packages
tasks: []
health_checks:
  - primary # displayed "RPC"
  - sync-progress # displayed "Blockchain Sync"
  - peer-connections # displayed "Peer Connections"
  - grpc # displayed "gRPC"
  - rpc-plaintext # displayed "RPC Plaintext Proxy"
  - tor # displayed "Tor"
  - clearnet # displayed "Clearnet"
  - i2p # displayed "I2P"; always disabled
```
