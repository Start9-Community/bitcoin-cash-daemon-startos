import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.22.2:5',
  releaseNotes: {
    en_US:
      'Updated the package runtime for more reliable startup and health checks. Added outbound-traffic privacy guidance.',
    es_ES:
      'Se actualizó el entorno de ejecución del paquete para mejorar el inicio y las comprobaciones de estado. Se añadieron recomendaciones de privacidad para el tráfico saliente.',
    de_DE:
      'Die Paketlaufzeit wurde für einen zuverlässigeren Start und zuverlässigere Zustandsprüfungen aktualisiert. Hinweise zum Datenschutz bei ausgehendem Datenverkehr wurden ergänzt.',
    pl_PL:
      'Zaktualizowano środowisko wykonawcze pakietu, poprawiając niezawodność uruchamiania i kontroli stanu. Dodano wskazówki dotyczące prywatności ruchu wychodzącego.',
    fr_FR:
      'Mise à jour de l’environnement d’exécution du paquet pour fiabiliser le démarrage et les contrôles d’état. Ajout de conseils de confidentialité pour le trafic sortant.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
