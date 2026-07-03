import { setupManifest } from '@start9labs/start-sdk'

export const manifest = setupManifest({
  id: 'bchd',
  title: 'Bitcoin Cash Daemon',
  license: 'ISC',
  packageRepo: 'https://github.com/BitcoinCash1/bitcoin-cash-daemon-startos',
  upstreamRepo: 'https://github.com/gcash/bchd',
  marketingUrl: 'https://bchd.cash',
  donationUrl: null,
  docsUrls: [
    'https://github.com/BitcoinCash1/bitcoin-cash-daemon-startos/blob/master/instructions.md',
    'https://github.com/gcash/bchd',
  ],
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
  dependencies: {
    tor: {
      description:
        'Enables Tor onion routing for anonymous peer-to-peer connections. When Tor is installed and running, BCHD automatically routes all connections through the Tor network for enhanced privacy.',
      optional: true,
      metadata: {
        title: 'Tor',
        icon: 'https://raw.githubusercontent.com/Start9Labs/tor-startos/65faea17febc739d910e8c26ff4e61f6333487a8/icon.svg',
      },
    },
  },
})
