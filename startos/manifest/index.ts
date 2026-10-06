import { setupManifest } from '@start9labs/start-sdk'

export const manifest = setupManifest({
  id: 'bchd',
  title: 'Bitcoin Cash Daemon',
  license: 'ISC',
  packageRepo:
    'https://github.com/Start9-Community/bitcoin-cash-daemon-startos',
  upstreamRepo: 'https://github.com/gcash/bchd',
  marketingUrl: 'https://bchd.cash',
  donationUrl: null,
  description: {
    short: 'BCHD — Go-based Bitcoin Cash full node with gRPC and Neutrino',
    long: 'BCHD is a full node implementation of the Bitcoin Cash protocol written in Go. Features include JSON-RPC API, gRPC API with pub/sub notifications, BIP 157/158 compact block filters (Neutrino), BIP 37 bloom filters, full transaction and address indexes, and Tor support for private peer connections.',
  },
  volumes: ['main'],
  images: {
    bchd: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64', 'riscv64'],
    },
  },
})
