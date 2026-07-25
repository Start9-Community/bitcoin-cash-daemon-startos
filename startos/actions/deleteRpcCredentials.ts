import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

export const deleteRpcCredentials = sdk.Action.withInput(
  'delete-rpc-credentials',

  async ({ effects }) => ({
    name: 'Delete RPC Credentials',
    description: 'Remove one or more stored RPC credentials by name.',
    warning: 'Selected credentials will be permanently deleted.',
    allowedStatuses: 'any',
    group: 'Credentials',
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const store = await storeJson.read().once()
    const creds = store?.rpcCredentials ?? []

    const values: Record<string, string> = {}
    for (const c of creds) values[c.name] = c.name

    return InputSpec.of({
      names: Value.multiselect({
        name: 'Credentials',
        description: 'Select one or more credentials to delete.',
        warning: null,
        default: [],
        values,
      }),
    })
  },

  async ({ effects }) => ({ names: [] as string[] }),

  async ({ effects, input }) => {
    const { names } = input
    if (!names || (names as string[]).length === 0) {
      return {
        version: '1' as const,
        title: 'No Credentials Selected',
        message: 'Nothing was deleted.',
        result: null,
      }
    }

    const toDelete = new Set(names as string[])
    const store = await storeJson.read().once()
    const creds = store?.rpcCredentials ?? []
    const filtered = creds.filter((c) => !toDelete.has(c.name))

    // Update legacy fields to match the new first credential
    const active = filtered[0]
    await storeJson.merge(effects, {
      rpcCredentials: filtered,
      rpcUser: active?.username ?? 'bchd',
      rpcPassword: active?.password ?? '',
    })

    const deleted = [...toDelete].join(', ')
    return {
      version: '1' as const,
      title: 'Credentials Deleted',
      message: `Removed: ${deleted}.${filtered.length > 0 ? ` Active credential is now "${filtered[0]!.name}".` : ' No credentials remaining.'}`,
      result: null,
    }
  },
)
