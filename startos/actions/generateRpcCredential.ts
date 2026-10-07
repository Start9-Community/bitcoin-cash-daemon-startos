import { utils } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

const spec = InputSpec.of({
  username: Value.text({
    name: 'Username',
    description: null,
    required: true,
    default: null,
    masked: false,
    placeholder: 'bchd',
    patterns: [
      {
        regex: '^[A-Za-z0-9]+$',
        description: 'Letters and digits only',
      },
    ],
  }),
})

export const generateRpcCredential = sdk.Action.withInput(
  'generate-rpc-credential',

  async ({ effects }) => ({
    name: 'Change RPC Credentials',
    description:
      'Replace the RPC username and password with the username you enter and a new random password. BCHD accepts one set of RPC credentials.',
    warning: (await storeJson.read((s) => s.rpcPassword).once())
      ? 'Replaces the current RPC username and password, and restarts BCHD if it is running. Anything still using the old ones loses RPC access.'
      : null,
    allowedStatuses: 'any',
    group: 'Credentials',
    visibility: 'enabled',
  }),

  spec,

  async ({ effects }) => ({
    username: (await storeJson.read((s) => s.rpcUser).once()) ?? undefined,
  }),

  async ({ effects, input }) => {
    const password = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    })
    await storeJson.merge(effects, {
      rpcUser: input.username,
      rpcPassword: password,
    })
    // main reads the credentials once at start.
    await effects.restart()

    return {
      version: '1' as const,
      title: 'RPC Credentials Changed',
      message: 'You can view them anytime in **View RPC Credentials**.',
      result: {
        type: 'group' as const,
        value: [
          {
            type: 'single' as const,
            name: 'Username',
            description: null,
            value: input.username,
            copyable: true,
            qr: false,
            masked: false,
          },
          {
            type: 'single' as const,
            name: 'Password',
            description: null,
            value: password,
            copyable: true,
            qr: false,
            masked: true,
          },
        ],
      },
    }
  },
)
