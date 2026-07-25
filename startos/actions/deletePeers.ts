import { sdk } from '../sdk'
import { mainMounts } from '../mounts'
import { rootDir } from '../utils'

export const deletePeers = sdk.Action.withoutInput(
  'delete-peers',
  async ({ effects: _effects }) => ({
    name: 'Delete Peer List',
    description:
      'Delete the peer address database to reset known peers. BCHD will rebuild it from DNS seeds on next startup.',
    warning:
      'All known peer addresses will be lost. The node will need to rediscover peers on next startup, which may take a few minutes.',
    allowedStatuses: 'only-stopped' as const,
    group: 'Maintenance',
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bchd' },
      mainMounts,
      'delete-peers',
      async (sub) => {
        // BCHD keeps peer state in peers.json (and legacy peers.dat).
        await sub.exec([
          'sh',
          '-c',
          `rm -f ${rootDir}/peers.json ${rootDir}/peers.dat`,
        ])
      },
    )
    return {
      version: '1' as const,
      title: 'Peer List Deleted',
      message:
        'Peer address database removed. BCHD will rebuild it from DNS seeds on next startup.',
      result: null,
    }
  },
)
