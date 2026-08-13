import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.22.2:1',
  releaseNotes: {
    en_US: `Blockchain Sync no longer reports Synced while the node is still catching up.

The check asked the node for a flag that Bitcoin Cash Daemon does not publish, so it read as absent at every height and was taken to mean "finished". A node one block into a fresh chain reported itself fully synced, and services that wait for it — mining pools especially, where building on a stale tip produces blocks the network rejects — were told to go ahead. Progress is now read from the height the node has actually reached against the best height its peers have offered. The Runtime Info action reported the same thing the same way, and is corrected with it.`,
    es_ES: `«Sincronización de la cadena» ya no indica Sincronizado mientras el nodo aún se está poniendo al día.

La comprobación pedía al nodo un indicador que Bitcoin Cash Daemon no publica, así que se leía como ausente a cualquier altura y se interpretaba como «terminado». Un nodo con un solo bloque de una cadena nueva se declaraba totalmente sincronizado, y los servicios que lo esperan —sobre todo los pools de minería, donde construir sobre una punta obsoleta produce bloques que la red rechaza— recibían luz verde. Ahora el progreso se calcula con la altura que el nodo ha alcanzado realmente frente a la mejor altura ofrecida por sus pares. La acción «Información de ejecución» indicaba lo mismo por el mismo motivo, y se corrige junto con ella.`,
    de_DE: `„Blockchain-Synchronisierung" meldet nicht mehr Synchronisiert, während der Knoten noch aufholt.

Die Prüfung fragte den Knoten nach einem Merkmal, das Bitcoin Cash Daemon nicht veröffentlicht — es fehlte also auf jeder Höhe und wurde als „fertig" gewertet. Ein Knoten mit einem einzigen Block einer frischen Chain meldete sich als vollständig synchronisiert, und Dienste, die darauf warten — insbesondere Mining-Pools, wo das Bauen auf einer veralteten Spitze vom Netzwerk abgelehnte Blöcke erzeugt — bekamen grünes Licht. Der Fortschritt wird jetzt aus der tatsächlich erreichten Höhe im Vergleich zur besten von den Peers gemeldeten Höhe ermittelt. Die Aktion „Laufzeitinformationen" meldete dasselbe auf dieselbe Weise und wird mit korrigiert.`,
    pl_PL: `„Synchronizacja łańcucha" nie pokazuje już Zsynchronizowano, gdy węzeł wciąż nadrabia zaległości.

Kontrola pytała węzeł o flagę, której Bitcoin Cash Daemon nie udostępnia, więc na każdej wysokości odczytywano jej brak i traktowano to jako „zakończono". Węzeł z jednym blokiem nowego łańcucha ogłaszał się w pełni zsynchronizowanym, a usługi, które na niego czekają — zwłaszcza kopalnie, gdzie budowanie na nieaktualnym szczycie daje bloki odrzucane przez sieć — dostawały zielone światło. Postęp jest teraz liczony z wysokości faktycznie osiągniętej przez węzeł względem najlepszej wysokości zgłoszonej przez jego węzły sąsiednie. Akcja „Informacje o działaniu" pokazywała to samo z tego samego powodu i została poprawiona razem z nią.`,
    fr_FR: `« Synchronisation de la chaîne » n'indique plus Synchronisé alors que le nœud rattrape encore son retard.

Le contrôle demandait au nœud un indicateur que Bitcoin Cash Daemon ne publie pas : il était donc absent à toute hauteur et interprété comme « terminé ». Un nœud comptant un seul bloc d'une chaîne neuve se déclarait entièrement synchronisé, et les services qui l'attendent — surtout les pools de minage, où bâtir sur une pointe périmée produit des blocs que le réseau rejette — recevaient le feu vert. La progression est désormais calculée à partir de la hauteur réellement atteinte par le nœud, comparée à la meilleure hauteur annoncée par ses pairs. L'action « Informations d'exécution » rapportait la même chose de la même façon ; elle est corrigée avec.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
