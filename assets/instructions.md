# Bitcoin Cash Daemon (BCHD)

BCHD is a full node implementation of the Bitcoin Cash protocol written in Go.
It begins syncing the BCH blockchain the moment it launches — nothing needs
configuring first. This page covers what is specific to running it on StartOS.

## What you get on StartOS

- A full BCH node — downloads, verifies, and relays the entire blockchain, then stays in sync.
- A **JSON-RPC interface** (TLS on port 8332) that wallets, indexers, and other StartOS services connect to.
- A **plaintext RPC proxy** (stunnel, port 8334) for mining software (asicseer-pool, ckpool) that has no TLS support.
- A **gRPC API** (port 8335) with pub/sub notifications — used by Neutrino light clients for compact block filter synchronisation (BIP 157/158).
- **BIP 37 bloom filters** for SPV wallets.
- Full **transaction index** (`txindex`) and **address index** (`addrindex`) — required by wallets and indexers that look up arbitrary txids or addresses.
- **Tor** support — when Tor is installed and synced, BCHD routes outbound peer connections through Tor. Tor is deferred during Initial Block Download to maximise sync speed and activated automatically once IBD completes.
- Multiple network support: **mainnet**, **testnet3**, **chipnet**, and **regtest**.

## Getting started

BCHD begins its Initial Block Download the moment it launches. A full IBD takes
several hours to a day depending on hardware and network speed. Watch progress on
the **Dashboard** — the Blockchain Sync health check shows percentage and block
height in real time.

Dependent StartOS services (Fulcrum BCH, BCH Explorer, mining pools) connect to
BCHD automatically when you install them. They will indicate they are waiting for
sync to complete before becoming fully operational.

## RPC access

The JSON-RPC API listens on **port 8332** (TLS). External wallets and apps that
support self-signed TLS certificates point to this port.

For mining software (ASICSeer, EloPool, ckpool) that has no TLS library, the
**RPC Plaintext Proxy** at **port 8334** (plain HTTP via stunnel) forwards all
connections to BCHD's native TLS RPC transparently.

To mint credentials for an external wallet or app:

- **Actions → Generate RPC Credential** — create a username/password pair.
- **Actions → View RPC Credentials** — display existing credentials.
- **Actions → Delete RPC Credential** — revoke a credential.

## gRPC / Neutrino

BCHD's gRPC API (**port 8335**, TLS) serves BIP 157/158 compact block filters for
Neutrino light clients. Enable it in **Config → Node Settings → gRPC Listen**.
Neutrino clients connect directly to port 8335 using a BCH-aware gRPC library.

## Configuration

All settings live under **Config** in the service interface.

- **Network** — mainnet (default), testnet3, chipnet, or regtest.
- **Transaction / Address Index** — enable to allow arbitrary txid and address lookups (required by Fulcrum BCH and BCH Explorer).
- **gRPC Listen** — enable the gRPC server for Neutrino clients.
- **Compact Block Filters** — disable (`nocfilters`) if you do not need BIP 157/158 filter serving.
- **Peers / onlynet** — restrict outbound peer connections to specific networks (IPv4, IPv6, Tor).
- **Database Cache** — tune LevelDB cache size for faster IBD on high-RAM machines.
- **Max Peers** — maximum number of simultaneous peer connections.
- **Bloom Filters** — disable if you do not need to serve SPV wallets.
- **Prune** — enable pruning to reduce disk usage (disables txindex/addrindex).

## Maintenance actions

- **Reindex Blockchain** — rebuild blocks and chainstate from scratch (use after on-disk corruption).
- **Reindex Chainstate** — rebuild only the UTXO set from stored block files.
- **Mempool Settings** — configure mempool size and persistence.
- **Network Settings** — configure onlynet, externalip, and Tor isolation.
- **RPC Peers Settings** — manage whitelisted RPC peers.
- **Runtime Information** — view live connection count, block height, and sync progress.

## Ports

| Port  | Protocol       | Purpose                                       |
| ----- | -------------- | --------------------------------------------- |
| 8332  | JSON-RPC (TLS) | RPC API — mainnet                             |
| 8333  | P2P            | Peer-to-peer — mainnet                        |
| 8334  | HTTP plaintext | RPC Plaintext Proxy (stunnel → port 8332 TLS) |
| 8335  | gRPC (TLS)     | gRPC API — Neutrino light clients             |
| 18332 | JSON-RPC (TLS) | RPC API — testnet3                            |
| 18333 | P2P            | Peer-to-peer — testnet3                       |
| 48332 | JSON-RPC (TLS) | RPC API — chipnet                             |
| 48333 | P2P            | Peer-to-peer — chipnet                        |
| 18443 | JSON-RPC (TLS) | RPC API — regtest                             |
| 18444 | P2P            | Peer-to-peer — regtest                        |

## Limitations

- Blockchain data is not backed up. Backups cover configuration and credentials only.
  Block and chainstate data re-sync after a restore.
- Shutdown can take up to 5 minutes while the database flushes; let it finish rather
  than force-stopping.
- Tor routing is deferred until Initial Block Download completes to avoid crippling
  sync speed; it activates automatically on the next restart after IBD finishes.

## Support

- Package: <https://github.com/BitcoinCash1/bitcoin-cash-daemon-startos>
- Upstream: <https://github.com/gcash/bchd>
