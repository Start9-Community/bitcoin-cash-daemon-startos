import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.22.2:2',
  releaseNotes: {
    en_US: `Deleting mainnet or test network data no longer stops partway through on a large data directory.`,
    es_ES: `Eliminar los datos de mainnet o de las redes de prueba ya no se detiene a medias en un directorio de datos grande.`,
    de_DE: `Das Löschen von Mainnet- oder Testnetzdaten bricht bei einem großen Datenverzeichnis nicht mehr mittendrin ab.`,
    pl_PL: `Usuwanie danych mainnetu lub sieci testowych nie zatrzymuje się już w połowie przy dużym katalogu danych.`,
    fr_FR: `La suppression des données du mainnet ou des réseaux de test ne s'arrête plus en cours de route sur un répertoire de données volumineux.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
