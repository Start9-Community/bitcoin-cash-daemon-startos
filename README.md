<div align="center">
  <img src="assets/bchd-logo.svg" alt="BCHD logo" width="21%" />
  <h1>Bitcoin Cash Daemon (BCHD)</h1>
</div>

> **Upstream:** [github.com/gcash/bchd](https://github.com/gcash/bchd)
>
> BCHD is a full-node implementation of the Bitcoin Cash protocol written in Go. It provides a JSON-RPC API, a gRPC API with pub/sub notifications, BIP 157/158 compact block filters (Neutrino), BIP 37 bloom filters, full transaction and address indexes, and Tor support for private peer connections.

This is the technical reference for the StartOS package (for developers and AI assistants). End-user docs live in [`instructions.md`](instructions.md).

---

## Table of Contents

1. [Image and Container Runtime](#1-image-and-container-runtime)
2. [Volume and Data Layout](#2-volume-and-data-layout)
3. [Installation and First-Run Flow](#3-installation-and-first-run-flow)
4. [Default Networking](#4-default-networking)
5. [Configuration Management](#5-configuration-management)
6. [Network Access and Interfaces](#6-network-access-and-interfaces)
7. [Actions (StartOS UI)](#7-actions-startos-ui)
8. [Backups and Restore](#8-backups-and-restore)
9. [Health Checks](#9-health-checks)
10. [Dependencies](#10-dependencies)
11. [Default Overrides](#11-default-overrides)
12. [Limitations and Differences](#12-limitations-and-differences)

---

## 1. Image and Container Runtime

| Field | Value |
|---|---|
| **Image ID** | `bchd` |
| **Build** | `Dockerfile` — multi-stage. Stage 1 compiles `bchd`, `bchctl`, and `gencerts` from the pinned `gcash/bchd` source tag (`ARG BCHD_VERSION`) with the upgrade9 `getblocktemplate` patch applied (`patches/`). Stage 2 is a `debian:stable-slim` runtime with `stunnel4`, `e2fsprogs`, `netcat-openbsd`, and `ca-certificates`. |
| **Architectures** | `x86_64`, `aarch64` |
| **Subcontainers** | `node-sub` runs `bchd`. `stunnel-sub` runs a `stunnel4` plaintext→TLS RPC proxy (see §6). Both mount the `main` volume at `/data` and share a network namespace (loopback). |

---

## 2. Volume and Data Layout

| Volume | Mount Point | Purpose |
|---|---|---|
| `main` | `/data` | All node data, configuration, and credentials |

BCHD is launched with `--datadir=/data` and `--configfile=/data/bchd.conf` (the default `--logdir` is left at `/root/.bchd/logs`, which is container-ephemeral). On-disk layout:

| Path | Managed By | Purpose |
|---|---|---|
| `/data/bchd.conf` | StartOS SDK file model | BCHD configuration file |
| `/data/store.json` | StartOS SDK file model | Package state: network, RPC credential, Tor/onion flags, reindex flags, sync state |
| `/data/rpc.cert`, `/data/rpc.key` | `gencerts` (nocow oneshot) | Self-signed TLS certificate for RPC and gRPC |
| `/data/<network>/blocks_ffldb/` | BCHD | Block files and UTXO/chainstate metadata (per network: `mainnet`, `testnet3`, `testnet4`, `chipnet`, `regtest`) |
| `/data/<network>/peers.json` | BCHD | Cached peer addresses for that network |

---

## 3. Installation and First-Run Flow

1. StartOS builds the `bchd` image.
2. The `nocow` oneshot creates `/data`, applies the NoCOW attribute (`chattr +C`) for btrfs sequential-write performance, then runs `gencerts` to create `rpc.cert`/`rpc.key` if absent. It also strips any legacy `externalip[]=` lines from `bchd.conf` (BCHD passes external IPs via CLI).
3. On first install only, `seedFiles` generates a random RPC password and seeds `store.json` (network `mainnet`, a `Default` RPC credential) and `bchd.conf` with schema defaults.
4. The `primary` daemon launches `bchd`; its `ready` check polls `bchctl getinfo` over TLS.
5. The `stunnel-sub` plaintext RPC proxy starts in parallel.
6. BCHD begins Initial Block Download (IBD).
7. After sync completes, `store.json` is updated with `fullySynced: true`.
8. `watchHosts` records StartOS-assigned external addresses (onion always; clearnet when **Advertise Clearnet Inbound** is on and not in Onion-Only Mode) into `store.json`, which `main.ts` passes to BCHD as `--externalip`.

---

## 4. Default Networking

| Transport | Default | Inbound | How to Change |
|---|---|---|---|
| **Clearnet (IPv4/IPv6)** | Enabled — outbound; inbound only once an external IP is advertised | Set **Advertise Clearnet Inbound** in RPC & Peers Settings | Automatic via StartOS host discovery (`watchHosts`) |
| **Tor** | **Tor Routing** on by default — outbound is routed through Tor when the Tor package is installed and running | Once a `.onion` address is provisioned for the Peer interface | Toggle **Tor Routing** / **Onion-Only Mode** in RPC & Peers Settings |
| **I2P** | Not supported by `gcash/bchd` | — | — |

---

## 5. Configuration Management

Configuration is split into grouped actions that read/write `bchd.conf` (via an SDK file model) and `store.json`. BCHD reads `bchd.conf`; some settings are also (or only) passed as CLI flags by `main.ts`.

| Action (group: Configuration) | Settings |
|---|---|
| **Chain Network** | Network selection: `mainnet`, `testnet3`, `testnet4`, `chipnet`, `regtest`. Ports auto-adjust; switching restarts BCHD. |
| **Node Settings** | Transaction Index, Address Index, Fast Sync, Prune Depth, gRPC API toggle, BIP 37 bloom filters, BIP 157/158 compact filters, Database Cache, UTXO Cache, DB Flush Interval. |
| **RPC & Peers Settings** | Max Peers, Onion-Only Mode, Advertise Clearnet Inbound, Tor Routing, Tor Stream Isolation. |
| **Mempool & Block Policy** | Excessive Block Size, Minimum Relay Fee. |

> **Index/Sync interlocks:** Pruning and Fast Sync are each incompatible with the transaction/address indexes. Enabling Prune or Fast Sync forces `txindex`/`addrindex` off. Once Fast Sync has been used on a data directory, the transaction index is permanently unavailable until the chain is deleted (Maintenance → Delete Mainnet Data) and re-synced from genesis.

---

## 6. Network Access and Interfaces

BCHD's RPC and gRPC servers serve **native TLS** using the self-signed `rpc.cert` (BCHD warns against `--notls` when binding to non-loopback addresses, which StartOS requires). Those interfaces are declared as pass-through TLS so StartOS forwards raw TLS and hands clients `https://` URLs.

| Interface | id | Mainnet Port | Protocol | Condition |
|---|---|---|---|---|
| RPC Interface | `rpc` | 8332 | HTTPS (TLS pass-through) | Always |
| Peer Interface | `peer` | 8333 | TCP (P2P) | Always |
| RPC Plaintext Proxy | `rpc-plaintext` | 8334 | HTTP | Always |
| gRPC Interface | `grpc` | 8335 | HTTPS (TLS pass-through) | When gRPC is enabled in Node Settings |

**Per-network ports** (`rpc` / `peer` / `grpc`): mainnet `8332/8333/8335`, testnet3 `18332/18333/18335`, testnet4 `28332/28333/28335`, chipnet `48334/48333/48335`, regtest `18444/18445/18446`. The plaintext proxy is always `8334`.

> **RPC Plaintext Proxy:** ckpool-lineage mining software (asicseer-pool, ckpool) has no TLS library. The `stunnel-sub` sidecar accepts plaintext JSON-RPC on `8334` and forwards it over TLS to BCHD's RPC on loopback `8332`. If/when that software gains TLS support, this sidecar and interface can be removed in a single commit.

---

## 7. Actions (StartOS UI)

| Action ID | Name | Group | Description |
|---|---|---|---|
| `runtime-info` | Node Info | Info | Version, protocol, relay fee, peer count, chain, and sync status via `bchctl getinfo`/`getblockchaininfo`/`getpeerinfo` (over TLS). |
| `network-settings` | Chain Network | Configuration | Select the BCH network; restarts BCHD. |
| `node-settings` | Node Settings | Configuration | Indexes, pruning, Fast Sync, gRPC, filters, DB/UTXO cache, flush interval. |
| `rpc-peers-settings` | RPC & Peers Settings | Configuration | Max peers, Tor routing/isolation, Onion-Only Mode, clearnet advertising. Restarts BCHD. |
| `mempool-settings` | Mempool & Block Policy | Configuration | Excessive block size, minimum relay fee. |
| `view-rpc-credentials` | View RPC Credentials | Credentials | Show the RPC username, password, and port. |
| `generate-rpc-credential` | Generate RPC Credential | Credentials | Generate a new password and set it as **the** RPC credential (BCHD accepts a single RPC user), then restart. |
| `reindex-chainstate` | Reindex Chainstate | Maintenance | Rebuild the UTXO database from existing block files (`--reindexchainstate`); restarts. |
| `delete-peers` | Delete Peer List | Maintenance | Remove `peers.json` (rebuilt from DNS seeds). Stopped only. |
| `delete-test-network-data` | Delete Test Network Data | Maintenance | Delete a test network's `/data/<network>` directory. Never touches mainnet. |
| `delete-mainnet-data` | Delete Mainnet Data | Maintenance | Delete `/data/mainnet` (re-sync from genesis). Required to enable txindex after Fast Sync. |
| `autoconfig` | Auto-Configure | _hidden_ | Cross-package config hook for dependent services. |

---

## 8. Backups and Restore

`Backups.ofVolumes('main')` excludes the per-network data directories (`/mainnet`, `/testnet3`, `/testnet4`, `/chipnet`, `/regtest`), which hold all re-syncable data (blocks, UTXO metadata, indexes, peers).

**Backed up:** `bchd.conf`, `store.json`, `rpc.cert`, `rpc.key`.
**Not backed up:** all blockchain/chainstate/index/peer data — re-synced automatically after restore.

---

## 9. Health Checks

| Check | Method |
|---|---|
| **RPC** (daemon ready) | `bchctl getinfo` over TLS |
| **Blockchain Sync** | `getblockchaininfo`; compares `blocks` to `syncheight` (the best height advertised by peers) — syncing until caught up. (BCHD's `initialblockdownload` is omitted well before the tip, so it is not used.) |
| **Peer Connections** | `getpeerinfo`; reports total with inbound/outbound split |
| **gRPC** | `/proc/net/tcp` listen probe on the gRPC port (avoids TLS-handshake log noise); `disabled` when gRPC is off |
| **RPC Plaintext Proxy** | `/proc/net/tcp` listen probe on `8334` |
| **Tor** | Store flags + `getContainerIp`/`getStatus` for the Tor package; reports disabled/installed/running and inbound vs outbound |
| **Clearnet** | `disabled` under Onion-Only Mode; otherwise inbound vs outbound based on whether a non-onion `externalip` is published |

---

## 10. Dependencies

**Tor** (optional). Declared optional in the manifest; promoted to a `running` requirement by `dependencies.ts` while **Tor Routing** is enabled. Provides the SOCKS5 proxy at `tor.startos:9050` for Tor-routed P2P (`--onion`) and, in Onion-Only Mode, all outbound traffic (`--proxy`).

---

## 11. Default Overrides

| Setting | Upstream Default | StartOS Value | Reason |
|---|---|---|---|
| RPC/gRPC TLS | Optional | Always on (`--rpccert`/`--rpckey`) | StartOS binds to `0.0.0.0`; BCHD warns against `--notls` there |
| `--rpcmaxclients` | 10 | 50 | The health checks plus consumers can briefly exceed 10 concurrent RPC clients during IBD |
| `--externalip` | Unset | From `store.json` via `watchHosts` | Advertise the actual StartOS-assigned onion/clearnet addresses |
| Plaintext RPC | None | `stunnel4` sidecar on `8334` | ckpool-lineage miners have no TLS library |
| Filesystem | CoW | NoCOW (`chattr +C`) | Sequential block writes fragment heavily on btrfs CoW |

---

## 12. Limitations and Differences

1. BCHD does **not** implement Double Spend Proof (DSP). Use Bitcoin Cash Node (BCHN) if you require DSP relay.
2. BCHD's RPC authenticates a **single** user (`--rpcuser`/`--rpcpass`); all consumers share one credential. (A separate read-only `--rpclimituser` exists upstream but is not exposed here.)
3. The RPC/gRPC servers use a **self-signed** certificate; clients that verify TLS must trust `rpc.cert` or skip verification.
4. **Pruning and Fast Sync disable the transaction/address indexes**, and Fast Sync permanently locks out txindex for the life of the data directory.
5. BCHD has **no per-network (`onlynet`) restriction**. Network privacy is controlled by **Tor Routing** and **Onion-Only Mode** (which routes all traffic through Tor via `--proxy`).
