import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.22.2:6',
  releaseNotes: {
    en_US:
      "Peers and RPC and gRPC clients can now connect to BCHD over the server's IPv6 addresses.",
    es_ES:
      'Los pares y los clientes RPC y gRPC ahora pueden conectarse a BCHD a través de las direcciones IPv6 del servidor.',
    de_DE:
      'Peers sowie RPC- und gRPC-Clients können sich jetzt über die IPv6-Adressen des Servers mit BCHD verbinden.',
    pl_PL:
      'Peery oraz klienci RPC i gRPC mogą teraz łączyć się z BCHD przez adresy IPv6 serwera.',
    fr_FR:
      'Les pairs et les clients RPC et gRPC peuvent désormais se connecter à BCHD via les adresses IPv6 du serveur.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
