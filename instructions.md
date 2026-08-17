# Bitcoin Cash Daemon (BCHD)

BCHD is a full node implementation of the Bitcoin Cash protocol written in Go.
It begins syncing the BCH blockchain the moment it launches — nothing needs
configuring first. This page covers what is specific to running it on StartOS.

## Documentation

- [BCHD](https://github.com/gcash/bchd) — the upstream project: the JSON-RPC and
  gRPC API reference, configuration options, and release notes.

## What you get on StartOS

- A full BCH node — downloads, verifies, and relays the entire blockchain, then stays in sync.
- A **JSON-RPC interface** (TLS on port 8332) that wallets, indexers, and other StartOS services connect to.
- A **plaintext RPC proxy** (stunnel, port 8334) for mining software (asicseer-pool, ckpool) that has no TLS support.
- A **gRPC API** (port 8335) with pub/sub notifications — used by Neutrino light clients for compact block filter synchronisation (BIP 157/158).
- **BIP 37 bloom filters** for SPV wallets.
- Full **transaction index** (`txindex`) and **address index** (`addrindex`) — required by wallets and indexers that look up arbitrary txids or addresses.
- **Tor** support — routing is on by default and needs the Tor service installed and running. Turn it off, or enable stream isolation, from **RPC & Peers Settings**.
- Multiple network support: **mainnet**, **testnet3**, **testnet4**, **chipnet**, and **regtest**.

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
- **Actions → Delete RPC Credentials** — revoke one or more credentials.

The first credential in the list is the one BCHD itself authenticates with.
Generating a new one does not make it active, and deleting the first one changes
which credential the node uses on its next start.

## gRPC / Neutrino

BCHD's gRPC API (**port 8335**, TLS) serves BIP 157/158 compact block filters for
Neutrino light clients. It is on by default; turn it off under **Actions → Node
Settings** if you don't need it. Neutrino clients connect directly to port 8335
using a BCH-aware gRPC library.

## Configuration

All settings are actions on the service page.

- **Chain Network** — mainnet (default), testnet3, testnet4, chipnet, or regtest. Every port changes with it, and each network keeps its own data.
- **Node Settings** — transaction and address indexes, Fast Sync, pruning, the gRPC toggle, bloom filters, compact block filters, and cache sizes.
- **RPC & Peers Settings** — maximum peers, which networks to connect over, Tor routing and stream isolation, and whether to advertise a clearnet address for inbound peers.
- **Mempool & Block Policy** — excessive block size and the minimum relay fee.

Two settings under **Node Settings** are worth reading before you change them:

- **Address Index** is the slow one. It can turn a one-to-two-day sync into weeks, and Fulcrum BCH and BCH Explorer do not need it — they build their own. Leave it off unless something queries addresses from BCHD directly.
- **Fast Sync** cannot be undone. It skips every block before the last checkpoint, so those blocks are never downloaded and the transaction index can never be built afterwards. Recovering means **Delete Mainnet Data** and a full re-sync from scratch.

## Maintenance actions

- **Reindex Chainstate** — rebuild only the UTXO set from the blocks you already have. Use it if the chainstate is corrupted but the blocks are intact; it restarts the node and takes hours.
- **Delete Peer List** — forget cached peers and rediscover from DNS seeds. The service must be stopped.
- **Delete Test Network Data** — wipe data for test networks you no longer need. The network currently in use cannot be deleted; switch away first.
- **Delete Mainnet Data** — delete the mainnet blockchain entirely and start over. Configuration and credentials are kept. This is the way to recover the transaction index after using Fast Sync.
- **Node Info** — live version, network, connection count, block height, and sync progress.

## Ports

The plaintext proxy is always on port 8334. Every other port changes with the
selected network.

| Network  | JSON-RPC (TLS) | P2P   | gRPC (TLS) |
| -------- | -------------- | ----- | ---------- |
| mainnet  | 8332           | 8333  | 8335       |
| testnet3 | 18332          | 18333 | 18335      |
| testnet4 | 28332          | 28333 | 28335      |
| chipnet  | 48334          | 48333 | 48335      |
| regtest  | 18444          | 18445 | 18446      |

## Limitations

- Blockchain data is not backed up. Backups cover configuration and credentials only.
  Block and chainstate data re-sync after a restore.
- Shutdown can take up to 5 minutes while the database flushes; let it finish rather
  than force-stopping.
- The RPC and gRPC ports use a self-signed certificate. A client that verifies TLS
  must be told to trust it, or to skip verification.
