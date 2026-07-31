import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.22.2:0',
  releaseNotes: {
    en_US: `Updates Bitcoin Cash Daemon to 0.22.2, which closes a security issue and no longer needs a patch carried by this package.

Upstream fixed a flaw in how CashTokens minting permission was checked: a single authorised output in a transaction wrongly authorised every other one, which could be used to forge minting NFTs. It also fixed a crash a remote peer could trigger. Separately, a correction this package had been applying to the upstream source itself is now part of upstream, so Bitcoin Cash Daemon is once again built from unmodified source.`,
    es_ES: `Actualiza Bitcoin Cash Daemon a 0.22.2, que corrige un fallo de seguridad y elimina la necesidad de un parche que este paquete aplicaba.

El proyecto original corrigió un fallo en la comprobación del permiso de acuñación de CashTokens: una única salida autorizada dentro de una transacción autorizaba indebidamente a todas las demás, lo que permitía falsificar NFT de acuñación. También corrigió un fallo que un par remoto podía provocar. Además, una corrección que este paquete aplicaba al código original ya forma parte de él, por lo que Bitcoin Cash Daemon vuelve a compilarse a partir de código sin modificar.`,
    de_DE: `Aktualisiert Bitcoin Cash Daemon auf 0.22.2. Damit wird eine Sicherheitslücke geschlossen, und ein von diesem Paket mitgeführter Patch entfällt.

Das Upstream-Projekt hat einen Fehler in der Prüfung der CashTokens-Prägeberechtigung behoben: Eine einzelne berechtigte Ausgabe einer Transaktion berechtigte fälschlicherweise alle übrigen, wodurch sich Präge-NFTs fälschen ließen. Ebenfalls behoben wurde ein Absturz, den eine Gegenstelle auslösen konnte. Zudem ist eine Korrektur, die dieses Paket bisher am Upstream-Quelltext vornahm, nun dort selbst enthalten — Bitcoin Cash Daemon wird daher wieder aus unverändertem Quelltext gebaut.`,
    pl_PL: `Aktualizuje Bitcoin Cash Daemon do wersji 0.22.2, która usuwa lukę bezpieczeństwa i znosi potrzebę łatki dołączanej przez ten pakiet.

Projekt źródłowy naprawił błąd w sprawdzaniu uprawnienia do emisji CashTokens: pojedyncze uprawnione wyjście transakcji błędnie uprawniało wszystkie pozostałe, co pozwalało fałszować emisyjne NFT. Naprawiono też awarię, którą mógł wywołać zdalny węzeł. Ponadto poprawka, którą ten pakiet nanosił na kod źródłowy, jest już jego częścią, więc Bitcoin Cash Daemon ponownie budowany jest z niezmodyfikowanego kodu.`,
    fr_FR: `Met à jour Bitcoin Cash Daemon vers la version 0.22.2, qui corrige une faille de sécurité et rend inutile un correctif que ce paquet appliquait.

Le projet amont a corrigé un défaut dans la vérification de l'autorisation de frappe des CashTokens : une seule sortie autorisée dans une transaction autorisait à tort toutes les autres, ce qui permettait de contrefaire des NFT de frappe. Il a également corrigé un plantage qu'un pair distant pouvait déclencher. Par ailleurs, une correction que ce paquet appliquait au code amont y est désormais intégrée : Bitcoin Cash Daemon est donc de nouveau compilé à partir de sources non modifiées.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
