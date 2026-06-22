# Bitcoin Cash Daemon (BCHD)

BCHD is a full-node implementation of the Bitcoin Cash protocol written in Go.
It begins syncing the BCH blockchain the moment it launches — nothing needs
configuring first. This page covers what is specific to running it on StartOS.

## What you get on StartOS

- A full BCH node — downloads, verifies, and relays the entire blockchain, then stays in sync.
- A **JSON-RPC interface** (TLS, port 8332) that wallets, indexers, and other StartOS services connect to.
- A **plaintext RPC proxy** (port 8334) for mining software (asicseer-pool, ckpool) that has no TLS support.
- A **gRPC API** (TLS, port 8335) with pub/sub notifications — used by Neutrino light clients for compact block filter sync (BIP 157/158).
- **BIP 37 bloom filters** for SPV wallets.
- Full **transaction index** and **address index** — required by wallets and indexers that look up arbitrary txids or addresses.
- **Tor** support — when the Tor service is installed and running, BCHD routes outbound peer connections through Tor.
- Networks: **mainnet**, **testnet3**, **testnet4**, **chipnet**, and **regtest**.

## Getting started

BCHD begins its Initial Block Download the moment it launches. A full IBD takes
several hours to a day depending on hardware and network speed. Watch progress on
the **Dashboard** — the **Blockchain Sync** health check shows percentage and
block height in real time.

Dependent StartOS services (Fulcrum BCH, BCH Explorer, mining pools) connect to
BCHD automatically when you install them. They will indicate they are waiting for
sync to complete before becoming fully operational.

## RPC access

The JSON-RPC API listens on **port 8332** (TLS). External wallets and apps that
support self-signed TLS certificates point to this port.

For mining software (ASICSeer, EloPool, ckpool) that has no TLS library, the
**RPC Plaintext Proxy** at **port 8334** (plain HTTP) forwards connections to
BCHD's TLS RPC transparently.

BCHD accepts a **single** RPC user, so all consumers share one credential:

- **Actions → View RPC Credentials** — show the current username, password, and port.
- **Actions → Generate RPC Credential** — generate a new password, set it as the RPC
  credential, and restart. Update any connected services with the new password afterward.

## gRPC / Neutrino

BCHD's gRPC API (**port 8335**, TLS) serves BIP 157/158 compact block filters for
Neutrino light clients. Enable it under **Config → Node Settings → gRPC API**.

## Configuration

All settings live under **Config**:

- **Chain Network** — mainnet (default), testnet3, testnet4, chipnet, or regtest.
- **Node Settings** — transaction/address index, pruning, Fast Sync, gRPC, bloom and compact filters, database and UTXO cache.
- **RPC & Peers Settings** — max peers, Tor Routing, Tor Stream Isolation, Onion-Only Mode, and clearnet advertising.
- **Mempool & Block Policy** — excessive block size and minimum relay fee.

Notes:

- **Transaction / Address Index** are required by Fulcrum BCH and BCH Explorer for arbitrary txid/address lookups.
- **Pruning** and **Fast Sync** each disable the indexes. Fast Sync permanently locks out the transaction index for the life of the data directory — to re-enable it, run **Maintenance → Delete Mainnet Data** and re-sync.
- **Onion-Only Mode** routes all peer traffic through Tor (requires Tor Routing); clearnet is then never used.

## Maintenance actions

- **Reindex Chainstate** — rebuild the UTXO set from stored block files (after on-disk corruption).
- **Delete Peer List** — clear cached peers; BCHD rediscovers from DNS seeds.
- **Delete Test Network Data** — wipe a selected test network's data (never mainnet).
- **Delete Mainnet Data** — wipe mainnet data and re-sync from genesis.
- **Node Info** — view live version, connection count, block height, and sync progress.

## Ports

| Port  | Protocol        | Purpose                                        |
|-------|-----------------|------------------------------------------------|
| 8332  | JSON-RPC (TLS)  | RPC API — mainnet                              |
| 8333  | P2P             | Peer-to-peer — mainnet                         |
| 8334  | HTTP plaintext  | RPC Plaintext Proxy (→ 8332 TLS)               |
| 8335  | gRPC (TLS)      | gRPC API — Neutrino light clients              |
| 18332 / 18333 / 18335 | JSON-RPC / P2P / gRPC | testnet3                         |
| 28332 / 28333 / 28335 | JSON-RPC / P2P / gRPC | testnet4                         |
| 48334 / 48333 / 48335 | JSON-RPC / P2P / gRPC | chipnet                          |
| 18444 / 18445 / 18446 | JSON-RPC / P2P / gRPC | regtest                          |

## Limitations

- Blockchain data is **not** backed up — backups cover configuration and credentials only.
  Block and chainstate data re-sync after a restore.
- Shutdown can take up to 5 minutes while the database flushes; let it finish rather
  than force-stopping.
- BCHD does not implement Double Spend Proof (DSP); use Bitcoin Cash Node (BCHN) if you need it.

## Support

- Package: <https://github.com/BitcoinCash1/bitcoin-cash-daemon-startos>
- Upstream: <https://github.com/gcash/bchd>
