<div align="center">
  <img src="assets/bchd-logo.svg" alt="BCHD logo" width="21%" />
  <h1>Bitcoin Cash Daemon (BCHD)</h1>
</div>

> **Upstream docs:** [github.com/gcash/bchd](https://github.com/gcash/bchd)
>
> BCHD is a full node implementation of the Bitcoin Cash protocol written in Go. It provides JSON-RPC, gRPC with pub/sub notifications, BIP 157/158 compact block filters (Neutrino), BIP 37 bloom filters, full transaction and address indexes, and Tor support for private peer connections.

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
13. [What Is Unchanged from Upstream](#13-what-is-unchanged-from-upstream)
14. [Contributing](#14-contributing)
15. [Quick Reference for AI Consumers](#15-quick-reference-for-ai-consumers)

---

## 1. Image and Container Runtime

| Field             | Value                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Image ID**      | `bchd`                                                                                                                                          |
| **Build**         | Multi-stage Docker build from `Dockerfile` — `bchd` is cross-compiled from upstream source (pure Go, `CGO_ENABLED=0`) in the `bchd-build` stage |
| **Architectures** | `x86_64`, `aarch64`, `riscv64`                                                                                                                  |
| **Command**       | `bchd --configfile=/data/bchd.conf --datadir=/data --rpclisten=0.0.0.0:PORT --listen=0.0.0.0:PORT ...`                                          |
| **Sidecar**       | `stunnel4` in a second SubContainer — accepts plaintext RPC on port 8334, forwards to BCHD TLS RPC on 8332                                      |

---

## 2. Volume and Data Layout

| Volume Name | Mount Point | Purpose                                                           |
| ----------- | ----------- | ----------------------------------------------------------------- |
| `main`      | `/data`     | All node data: blockchain, chainstate, configuration, credentials |

**StartOS-managed files inside `/data`:**

| File / Directory       | Managed By                        | Purpose                                                           |
| ---------------------- | --------------------------------- | ----------------------------------------------------------------- |
| `bchd.conf`            | StartOS SDK file model            | Main BCHD configuration file                                      |
| `store.json`           | StartOS SDK file model            | Package state: network, credentials, reindex flags, `fullySynced` |
| `rpc.cert` / `rpc.key` | `gencerts` oneshot on first start | Self-signed TLS certificate for RPC and gRPC                      |
| `blocks/`              | BCHD                              | Raw block data                                                    |
| `chainstate/`          | BCHD                              | UTXO set (derived from blocks)                                    |
| `peers.json`           | BCHD                              | Cached peer addresses                                             |

---

## 3. Installation and First-Run Flow

1. StartOS builds or pulls the `bchd` container image.
2. The `nocow` oneshot runs: creates `/data`, applies NoCOW filesystem attribute (`chattr +C`) for performance on btrfs, then calls `gencerts` to generate `rpc.cert`/`rpc.key` if absent.
3. Any legacy `externalip[]=` lines are stripped from `bchd.conf` (BCHD rejects them at config parse; external IPs are now passed via CLI from `store.json`).
4. Seed files are written: `bchd.conf` and `store.json` with defaults (network: mainnet, auto-generated RPC credentials).
5. BCHD launches, connecting to the Bitcoin Cash mainnet P2P network and beginning Initial Block Download (IBD).
6. The `stunnel4` sidecar starts in parallel, providing a plaintext RPC proxy on port 8334 for ckpool-lineage mining pool software.
7. The Blockchain Sync health check reports progress during IBD.
8. After IBD completes, `store.json` is updated with `fullySynced: true`; Tor proxy routing activates (if installed and configured).
9. The `watchHosts` process monitors StartOS-assigned external addresses and passes them to BCHD as `--externalip` arguments.

---

## 4. Default Networking

| Transport                | Default                                                        | Inbound                                                        | How to Change                                                     |
| ------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Clearnet (IPv4/IPv6)** | Enabled — outbound only until an external IP is published      | Enabled automatically when StartOS assigns an external IP      | Automatic via StartOS host discovery (`watchHosts`)               |
| **Tor**                  | Enabled (proxy is deferred until IBD completes for sync speed) | Enabled once a `.onion` address is advertised via `externalip` | Toggle in Network Settings action; requires Tor package installed |
| **I2P**                  | Not implemented                                                | Not available                                                  | Not available                                                     |

---

## 5. Configuration Management

| Group                  | Settings Covered                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chain Network**      | Network selection: mainnet, testnet3, chipnet, regtest — RPC/P2P/gRPC ports auto-adjust on restart                                                                |
| **Node Settings**      | Transaction index, address index, pruning depth, gRPC API toggle, BIP 37 bloom filters, BIP 157/158 compact block filters, database cache size, DB flush interval |
| **RPC Peers Settings** | Whitelist of IPs / subnets permitted to connect to the RPC interface                                                                                              |
| **Mempool Settings**   | Mempool size limit, minimum relay fee, and related policy                                                                                                         |

---

## 6. Network Access and Interfaces

| Interface             | Port          | Protocol                 | Purpose                                                  | Condition                                          |
| --------------------- | ------------- | ------------------------ | -------------------------------------------------------- | -------------------------------------------------- |
| RPC Interface         | 8332          | HTTPS (TLS pass-through) | JSON-RPC API for wallets, tools, and dependent packages  | Always — mainnet                                   |
| RPC Plaintext Proxy   | 8334          | HTTP                     | Plaintext JSON-RPC via stunnel for ckpool-lineage miners | Always                                             |
| Peer Interface        | 8333          | TCP                      | P2P Bitcoin Cash network connections                     | Always — mainnet                                   |
| gRPC Interface        | 8335          | HTTPS (TLS pass-through) | BCHD gRPC API — compact filters, pub/sub notifications   | Only when `grpclisten` is enabled in Node Settings |
| RPC / Peer (testnet3) | 18332 / 18333 | HTTPS / TCP              | Testnet3                                                 | When network = testnet3                            |
| gRPC (testnet3)       | 18335         | HTTPS                    | gRPC on testnet3                                         | When network = testnet3 and gRPC enabled           |
| RPC / Peer (chipnet)  | 48334 / 48333 | HTTPS / TCP              | Chipnet                                                  | When network = chipnet                             |
| gRPC (chipnet)        | 48335         | HTTPS                    | gRPC on chipnet                                          | When network = chipnet and gRPC enabled            |
| RPC / Peer (regtest)  | 18444 / 18445 | HTTPS / TCP              | Regtest                                                  | When network = regtest                             |
| gRPC (regtest)        | 18446         | HTTPS                    | gRPC on regtest                                          | When network = regtest and gRPC enabled            |

---

## 7. Actions (StartOS UI)

### Info

| Action ID      | Name      | Description                                                                                                                                |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `runtime-info` | Node Info | Displays version, protocol version, relay fee, peer count, chain, sync progress via `bchctl getinfo` / `getblockchaininfo` / `getpeerinfo` |

### Configuration

| Action ID            | Name               | Description                                                                                          |
| -------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `network-settings`   | Chain Network      | Select BCH network (mainnet / testnet3 / chipnet / regtest); all ports auto-adjust on restart        |
| `node-settings`      | Node Settings      | Transaction index, pruning, gRPC toggle, bloom filters, compact filters, DB cache, DB flush interval |
| `rpc-peers-settings` | RPC Peers Settings | Whitelist IPs and subnets allowed to access the RPC interface                                        |
| `mempool-settings`   | Mempool Settings   | Max mempool size, minimum relay fee, and mempool expiry policy                                       |

### Credentials

| Action ID                 | Name                    | Description                                                               |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `view-rpc-credentials`    | View RPC Credentials    | Select a stored credential by name to reveal username, password, and port |
| `generate-rpc-credential` | Generate RPC Credential | Create a new named RPC credential (random password)                       |
| `delete-rpc-credentials`  | Delete RPC Credentials  | Remove a named credential from `store.json`                               |

### Maintenance

| Action ID                  | Name                     | Description                                                                |
| -------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `reindex-blockchain`       | Reindex Blockchain       | Delete chainstate and re-verify every block from genesis; takes many hours |
| `reindex-chainstate`       | Reindex Chainstate       | Rebuild the UTXO set only — faster than a full blockchain reindex          |
| `delete-peers`             | Delete Peer List         | Remove cached `peers.json`; BCHD rebuilds peer discovery on next start     |
| `delete-test-network-data` | Delete Test Network Data | Wipe data directory for the currently selected test network                |

### Hidden (cross-package)

| Action ID    | Name           | Description                                                                                                  |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------ |
| `autoconfig` | Auto-Configure | Called by dependent packages (Fulcrum, Explorer, ASICSeer, EloPool) to retrieve and validate RPC credentials |

---

## 8. Backups and Restore

**What IS backed up:**

- `bchd.conf` — node configuration
- `store.json` — credentials, network selection, reindex flags, sync state
- `rpc.cert` / `rpc.key` — TLS certificates
- Any other files in `/data` not listed below

**What is NOT backed up:**

- `/blocks` — raw blockchain data (too large; re-downloaded after restore)
- `/chainstate` — UTXO set (derived from blocks; rebuilt automatically)
- `/peers.json` — peer address cache (rebuilt on next connection)

Restoring overwrites current configuration. Blockchain data is not included and will be re-synced from genesis automatically after restore.

---

## 9. Health Checks

| Check                   | Method                                                                                                                      | Key Messages                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **RPC** (daemon ready)  | `bchctl getinfo`                                                                                                            | `BCHD RPC is ready` / `BCHD RPC is starting...`                                                                                                |
| **Blockchain Sync**     | `bchctl getblockchaininfo` — reads `verificationprogress`, `initialblockdownload`, `mediantime` (stale > 2 h means syncing) | `Synced — block N` / `Syncing blocks... X.XX% (N/M)`                                                                                           |
| **Peer Connections**    | `bchctl getpeerinfo` — counts total and inbound peers                                                                       | `N peers (X outbound, Y inbound)` / `No peers connected` / `Only N peer(s) connected`                                                          |
| **gRPC**                | `/proc/net/tcp` port-listen probe (avoids TLS handshake noise)                                                              | `gRPC API is listening on port 8335` / `gRPC API is disabled` / `gRPC API is starting up...`                                                   |
| **RPC Plaintext Proxy** | `/proc/net/tcp` port-listen probe                                                                                           | `Plaintext RPC proxy ready on port 8334 (stunnel → BCHD TLS)` / `Plaintext RPC proxy starting...`                                              |
| **Tor**                 | Store flags + `sdk.getStatus(tor)`                                                                                          | `Tor proxy active — inbound and outbound` / `Tor proxy configured — will activate after IBD` / `Tor routing deferred` / `Tor is not installed` |
| **Clearnet**            | `onlynet` config + `externalip` list                                                                                        | `Inbound and outbound connections` / `Outbound only. Publish an IP address to enable inbound.`                                                 |
| **I2P**                 | Static                                                                                                                      | `I2P support is not implemented yet.` (always disabled)                                                                                        |

---

## 10. Dependencies

### Tor (optional)

| Field                  | Value                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Package ID**         | `tor`                                                                                                                                                                                                                             |
| **Version constraint** | `>=0.4.9.11:2`                                                                                                                                                                                                                    |
| **Required state**     | Running (optional — used only when enabled in Chain Network settings)                                                                                                                                                             |
| **Address resolution** | SOCKS proxy address resolved reactively over the LXC bridge via `sdk.host.getBridgeAddress` (Tor's `socks` host, `.const()`); install/run state tracked via `sdk.getStatus`                                                        |
| **Mounted volumes**    | None                                                                                                                                                                                                                              |
| **Purpose**            | Provides a SOCKS5 proxy reachable over the internal service bridge (`<osIp>:9050`) for Tor-routed P2P and inbound `.onion` connections. Proxy activation is deferred until `fullySynced = true` to avoid IBD performance penalty. |

---

## 11. Default Overrides

| Setting              | Upstream Default               | StartOS Value                               | Reason                                                                                                         |
| -------------------- | ------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| RPC TLS              | Optional (`--notls` available) | Always enabled via `--rpccert` / `--rpckey` | StartOS binds RPC to `0.0.0.0`; BCHD warns against `--notls` on non-localhost; avoids log noise on every start |
| Tor proxy activation | Immediate on configure         | Deferred until `fullySynced = true`         | IBD via Tor is prohibitively slow; proxy activates automatically after the first full sync completes           |
| `--externalip`       | Not set                        | Written from `store.json` by `watchHosts`   | Ensures BCHD advertises the actual StartOS-assigned addresses (clearnet and/or Tor)                            |
| Plaintext RPC proxy  | Not present                    | `stunnel4` sidecar on port 8334             | ckpool-lineage mining software (ASICSeer, EloPool) has no TLS library                                          |
| Filesystem attribute | Default (CoW)                  | NoCOW via `chattr +C`                       | Blockchain sequential writes cause heavy fragmentation on btrfs Copy-on-Write filesystems                      |

---

## 12. Limitations and Differences

1. BCHD does **not** implement Double Spend Proof (DSP). Mining operations that require DSP relay should use Bitcoin Cash Node (BCHN) or Flowee.
2. Supported networks are **mainnet, testnet3, chipnet, and regtest only**. Testnet4 and scalenet are not supported by the upstream `gcash/bchd` codebase.
3. gRPC is **disabled by default** and must be explicitly enabled in Node Settings. This reduces resource usage for nodes that do not need the gRPC API.
4. The RPC server uses a **self-signed TLS certificate** (`rpc.cert`). Clients that perform TLS certificate verification must either trust this certificate or configure skip-verify.
5. **Pruning disables the transaction index.** Enabling the prune option in Node Settings automatically forces `txindex` and `addrindex` off.
6. **Tor proxy is not active during Initial Block Download.** This is intentional — IBD via Tor is too slow on most hardware. Tor routing begins automatically once `fullySynced = true` is written to `store.json`.
7. The **plaintext RPC proxy on port 8334** (stunnel sidecar) is a StartOS-only workaround. Once upstream ckpool-lineage software gains TLS support, this sidecar and the `rpc-plaintext` interface will be removed in a single commit.

---

## 13. What Is Unchanged from Upstream

- All Bitcoin Cash consensus rules and network protocols implemented in `gcash/bchd`
- Full JSON-RPC API compatibility with upstream `bchd`
- gRPC API with pub/sub notifications and compact block filter support
- BIP 157/158 Neutrino (compact block filters) behavior
- BIP 37 bloom filter support
- Transaction index (`txindex`) and address index (`addrindex`) functionality
- Peer connection logic, DNS seeding, and ban management
- Configuration file format (`bchd.conf`)

---

## 14. Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 15. Quick Reference for AI Consumers

```yaml
package_id: bchd
title: Bitcoin Cash Daemon
license: ISC
upstream_repo: https://github.com/gcash/bchd
package_repo: https://github.com/BitcoinCash1/bitcoin-cash-daemon-startos
image:
  id: bchd
  build: dockerfile
  source: Dockerfile (bchd cross-compiled from source)
architectures:
  - x86_64
  - aarch64
  - riscv64
volumes:
  - name: main
    mountpoint: /data
    purpose: blockchain data, config, credentials
ports:
  - interface: rpc
    port: 8332
    protocol: https
    purpose: JSON-RPC over TLS
    condition: always (mainnet)
  - interface: rpc-plaintext
    port: 8334
    protocol: http
    purpose: plaintext RPC proxy (stunnel) for mining pool software
    condition: always
  - interface: peer
    port: 8333
    protocol: tcp
    purpose: P2P Bitcoin Cash network
    condition: always (mainnet)
  - interface: grpc
    port: 8335
    protocol: https
    purpose: gRPC API over TLS
    condition: when grpclisten is enabled in Node Settings
networks_supported:
  mainnet: { rpc: 8332, peer: 8333, grpc: 8335 }
  testnet3: { rpc: 18332, peer: 18333, grpc: 18335 }
  chipnet: { rpc: 48334, peer: 48333, grpc: 48335 }
  regtest: { rpc: 18444, peer: 18445, grpc: 18446 }
dependencies:
  tor:
    optional: true
    purpose: SOCKS5 proxy for Tor-routed P2P and inbound .onion connections
startos_managed_files:
  - /data/bchd.conf
  - /data/store.json
  - /data/rpc.cert
  - /data/rpc.key
actions:
  - { id: runtime-info, name: 'Node Info', group: Info }
  - { id: network-settings, name: 'Chain Network', group: Configuration }
  - { id: node-settings, name: 'Node Settings', group: Configuration }
  - { id: rpc-peers-settings, name: 'RPC Peers Settings', group: Configuration }
  - { id: mempool-settings, name: 'Mempool Settings', group: Configuration }
  - {
      id: view-rpc-credentials,
      name: 'View RPC Credentials',
      group: Credentials,
    }
  - {
      id: generate-rpc-credential,
      name: 'Generate RPC Credential',
      group: Credentials,
    }
  - {
      id: delete-rpc-credentials,
      name: 'Delete RPC Credentials',
      group: Credentials,
    }
  - { id: reindex-blockchain, name: 'Reindex Blockchain', group: Maintenance }
  - { id: reindex-chainstate, name: 'Reindex Chainstate', group: Maintenance }
  - { id: delete-peers, name: 'Delete Peer List', group: Maintenance }
  - {
      id: delete-test-network-data,
      name: 'Delete Test Network Data',
      group: Maintenance,
    }
  - { id: autoconfig, name: 'Auto-Configure', group: hidden }
health_checks:
  - { id: primary, display: 'RPC', method: 'bchctl getinfo' }
  - {
      id: sync-progress,
      display: 'Blockchain Sync',
      method: 'bchctl getblockchaininfo',
    }
  - {
      id: peer-connections,
      display: 'Peer Connections',
      method: 'bchctl getpeerinfo',
    }
  - { id: grpc, display: 'gRPC', method: '/proc/net/tcp port-listen probe' }
  - {
      id: rpc-plaintext,
      display: 'RPC Plaintext Proxy',
      method: '/proc/net/tcp port-listen probe',
    }
  - { id: tor, display: 'Tor', method: 'store flags + Tor package status' }
  - {
      id: clearnet,
      display: 'Clearnet',
      method: 'onlynet config + externalip list',
    }
  - { id: i2p, display: 'I2P', method: 'static disabled' }
backup_volumes:
  - main
backup_excludes:
  - /blocks
  - /chainstate
  - /peers.json
```
