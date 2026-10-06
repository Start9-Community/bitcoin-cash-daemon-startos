import { IMPOSSIBLE, VersionInfo, z } from '@start9labs/start-sdk'
import { bchdConf } from '../fileModels/bchd.conf'
import { storeJson } from '../fileModels/store.json'

export const current = VersionInfo.of({
  version: '0.22.2:3',
  releaseNotes: {
    en_US: `- Deleting mainnet or test network data no longer stops partway through on a large data directory.
- Node Info shows each value as its own labelled field.
- BCHD accepts one set of RPC credentials, and the package now keeps one. View RPC Credentials shows its username, password (masked) and the RPC port of the network BCHD is running, as copyable fields. Change RPC Credentials replaces the username and password, and restarts BCHD. Delete RPC Credentials is removed. An install with several credentials keeps the first, the one BCHD was using.
- A task from Fulcrum or the BCH Explorer changes only the settings it names. Your other Node and Peers settings, and gRPC, stay as you set them.
- When such a task asks for the Transaction Index while Fast Sync is on or has been used, it says so and leaves the index off, and BCHD keeps starting.
- Database Cache keeps the value you set across server restarts and updates.
- The descriptions of Tor Routing, Onion-Only Mode and the Tor dependency say what Tor carries: connections to .onion peers, and every connection only in Onion-Only Mode.
- Chain Network and Delete Test Network Data explain each option.
- BCHD starts with Onion-Only Mode on, and in that mode sends every outbound connection, clearnet peers included, through Tor.
- Allowed Networks is removed. BCHD connects over every network unless Onion-Only Mode is on.
- Excessive Block Size accepts 32000000 (32 MB) or more. A smaller saved value becomes 32000000, the size BCHD already used.`,
    es_ES: `- Eliminar los datos de mainnet o de las redes de prueba ya no se detiene a medias en un directorio de datos grande.
- Node Info muestra cada valor en su propio campo con nombre.
- BCHD acepta un único par de credenciales RPC, y el paquete ahora guarda uno. View RPC Credentials muestra su usuario, su contraseña (oculta) y el puerto RPC de la red en la que se ejecuta BCHD, en campos copiables. Change RPC Credentials sustituye el usuario y la contraseña y reinicia BCHD. Se elimina Delete RPC Credentials. Una instalación con varias credenciales conserva la primera, la que BCHD estaba usando.
- Una tarea de Fulcrum o de BCH Explorer cambia solo los ajustes que indica. El resto de tus ajustes de Node y Peers, y gRPC, quedan como los configuraste.
- Si una de esas tareas pide el Transaction Index mientras Fast Sync está activado o ya se ha usado, lo indica y deja el índice desactivado, y BCHD sigue arrancando.
- Database Cache conserva el valor que configuraste tras reiniciar el servidor y tras las actualizaciones.
- Las descripciones de Tor Routing, Onion-Only Mode y la dependencia de Tor indican qué pasa por Tor: las conexiones con pares .onion, y todas las conexiones solo en Onion-Only Mode.
- Chain Network y Delete Test Network Data explican cada opción.
- BCHD arranca con Onion-Only Mode activado y, en ese modo, envía todas las conexiones salientes por Tor, incluidas las de pares clearnet.
- Se elimina Allowed Networks. BCHD se conecta por todas las redes salvo que Onion-Only Mode esté activado.
- Excessive Block Size admite 32000000 (32 MB) o más. Un valor guardado menor pasa a 32000000, el tamaño que BCHD ya usaba.`,
    de_DE: `- Das Löschen von Mainnet- oder Testnetzdaten bricht bei einem großen Datenverzeichnis nicht mehr mittendrin ab.
- Node Info zeigt jeden Wert in einem eigenen beschrifteten Feld.
- BCHD akzeptiert genau einen Satz RPC-Zugangsdaten, und das Paket speichert jetzt genau einen. View RPC Credentials zeigt Benutzername, Passwort (maskiert) und den RPC-Port des Netzwerks, in dem BCHD läuft, in kopierbaren Feldern. Change RPC Credentials ersetzt Benutzername und Passwort und startet BCHD neu. Delete RPC Credentials entfällt. Eine Installation mit mehreren Zugangsdaten behält die ersten, die BCHD verwendet hat.
- Eine Aufgabe von Fulcrum oder dem BCH Explorer ändert nur die Einstellungen, die sie nennt. Deine übrigen Node- und Peers-Einstellungen und gRPC bleiben, wie du sie gesetzt hast.
- Verlangt eine solche Aufgabe den Transaction Index, während Fast Sync aktiv ist oder bereits verwendet wurde, meldet sie das und lässt den Index aus, und BCHD startet weiterhin.
- Database Cache behält den eingestellten Wert über Neustarts des Servers und Updates hinweg.
- Die Beschreibungen von Tor Routing, Onion-Only Mode und der Tor-Abhängigkeit sagen, was über Tor läuft: Verbindungen zu .onion-Peers, und nur im Onion-Only Mode jede Verbindung.
- Chain Network und Delete Test Network Data erklären jede Option.
- BCHD startet mit aktiviertem Onion-Only Mode und leitet in diesem Modus jede ausgehende Verbindung über Tor, auch die zu Clearnet-Peers.
- Allowed Networks entfällt. BCHD verbindet sich über alle Netzwerke, sofern Onion-Only Mode nicht aktiv ist.
- Excessive Block Size akzeptiert 32000000 (32 MB) oder mehr. Ein kleinerer gespeicherter Wert wird zu 32000000, der Größe, die BCHD bereits verwendet hat.`,
    pl_PL: `- Usuwanie danych mainnetu lub sieci testowych nie zatrzymuje się już w połowie przy dużym katalogu danych.
- Node Info pokazuje każdą wartość w osobnym, opisanym polu.
- BCHD akceptuje jeden zestaw danych logowania RPC i pakiet przechowuje teraz jeden. View RPC Credentials pokazuje nazwę użytkownika, hasło (zamaskowane) i port RPC sieci, w której działa BCHD, w polach do skopiowania. Change RPC Credentials zastępuje nazwę użytkownika i hasło oraz restartuje BCHD. Akcja Delete RPC Credentials zostaje usunięta. Instalacja z kilkoma danymi logowania zachowuje pierwsze, których używał BCHD.
- Zadanie od Fulcrum lub BCH Explorer zmienia tylko ustawienia, które wskazuje. Pozostałe ustawienia Node i Peers oraz gRPC zostają takie, jak je ustawiono.
- Gdy takie zadanie wymaga Transaction Index, a Fast Sync jest włączony lub był już użyty, informuje o tym i pozostawia indeks wyłączony, a BCHD nadal się uruchamia.
- Database Cache zachowuje ustawioną wartość po restartach serwera i aktualizacjach.
- Opisy Tor Routing, Onion-Only Mode i zależności od Tora mówią, co przechodzi przez Tora: połączenia z peerami .onion, a wszystkie połączenia tylko w Onion-Only Mode.
- Chain Network i Delete Test Network Data objaśniają każdą opcję.
- BCHD uruchamia się z włączonym Onion-Only Mode i w tym trybie kieruje każde połączenie wychodzące, także do peerów clearnet, przez Tora.
- Usunięto Allowed Networks. BCHD łączy się przez wszystkie sieci, chyba że włączony jest Onion-Only Mode.
- Excessive Block Size przyjmuje 32000000 (32 MB) lub więcej. Mniejsza zapisana wartość zmienia się na 32000000, rozmiar, którego BCHD i tak używał.`,
    fr_FR: `- La suppression des données du mainnet ou des réseaux de test ne s'arrête plus en cours de route sur un répertoire de données volumineux.
- Node Info affiche chaque valeur dans son propre champ nommé.
- BCHD accepte un seul jeu d'identifiants RPC, et le paquet n'en conserve désormais qu'un. View RPC Credentials affiche son nom d'utilisateur, son mot de passe (masqué) et le port RPC du réseau sur lequel BCHD fonctionne, dans des champs copiables. Change RPC Credentials remplace le nom d'utilisateur et le mot de passe, et redémarre BCHD. Delete RPC Credentials est supprimé. Une installation qui avait plusieurs identifiants conserve le premier, celui qu'utilisait BCHD.
- Une tâche de Fulcrum ou de BCH Explorer ne modifie que les réglages qu'elle nomme. Vos autres réglages Node et Peers, ainsi que gRPC, restent tels que vous les avez définis.
- Lorsqu'une telle tâche demande le Transaction Index alors que Fast Sync est activé ou a déjà été utilisé, elle le signale et laisse l'index désactivé, et BCHD continue de démarrer.
- Database Cache conserve la valeur que vous avez définie après un redémarrage du serveur et après les mises à jour.
- Les descriptions de Tor Routing, Onion-Only Mode et de la dépendance Tor indiquent ce qui passe par Tor : les connexions aux pairs .onion, et toutes les connexions uniquement en Onion-Only Mode.
- Chain Network et Delete Test Network Data expliquent chaque option.
- BCHD démarre avec Onion-Only Mode activé et, dans ce mode, fait passer chaque connexion sortante par Tor, y compris vers les pairs clearnet.
- Allowed Networks est supprimé. BCHD se connecte sur tous les réseaux, sauf si Onion-Only Mode est activé.
- Excessive Block Size accepte 32000000 (32 Mo) ou plus. Une valeur enregistrée plus petite devient 32000000, la taille que BCHD utilisait déjà.`,
  },
  migrations: {
    up: async ({ effects }) => {
      let onionOnly = false
      // BCHD refuses onlynet; an onion-only list is what Onion-Only Mode wrote.
      await bchdConf.update(effects, (conf) => {
        if (!conf) return null
        const { onlynet, ...rest } = conf
        const nets = [onlynet].flat().filter(Boolean)
        if (nets.length && nets.every((n) => n === 'onion')) onionOnly = true
        return {
          ...rest,
          excessiveblocksize: Math.max(rest.excessiveblocksize || 0, 32000000),
        }
      })

      // BCHD accepts one RPC credential; keep the first, the one it was running with.
      await storeJson.update(effects, (store) => {
        if (!store) return null
        const { rpcCredentials, ...rest } = store
        const first = z
          .array(z.looseObject({ username: z.string(), password: z.string() }))
          .catch([])
          .parse(rpcCredentials)[0]
        return {
          ...rest,
          ...(first && {
            rpcUser: first.username,
            rpcPassword: first.password,
          }),
          ...(onionOnly && { onionOnly }),
        }
      })
    },
    down: IMPOSSIBLE,
  },
})
