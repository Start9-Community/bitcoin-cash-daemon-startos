import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.22.2:7',
  releaseNotes: {
    en_US:
      'Requires StartOS 0.4.2 or later. The package now verifies the BCHD source it builds against a pinned checksum.',
    es_ES:
      'Requiere StartOS 0.4.2 o posterior. El paquete ahora verifica el código fuente de BCHD que compila con una suma de comprobación fijada.',
    de_DE:
      'Erfordert StartOS 0.4.2 oder neuer. Das Paket prüft den gebauten BCHD-Quellcode jetzt gegen eine festgelegte Prüfsumme.',
    pl_PL:
      'Wymaga StartOS 0.4.2 lub nowszego. Pakiet weryfikuje teraz budowany kod źródłowy BCHD względem przypiętej sumy kontrolnej.',
    fr_FR:
      'Nécessite StartOS 0.4.2 ou ultérieur. Le paquet vérifie désormais le code source de BCHD qu’il compile à l’aide d’une somme de contrôle fixée.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
