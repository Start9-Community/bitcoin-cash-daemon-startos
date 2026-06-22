import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

const spec = InputSpec.of({
  name: Value.text({
    name: 'Credential Name',
    description:
      'A friendly label for this credential (e.g. "Fulcrum", "Explorer", "Wallet").',
    required: true,
    default: null,
    masked: false,
    placeholder: 'My Service',
  }),
  username: Value.text({
    name: 'Username',
    description: 'Alphanumeric username for RPC authentication.',
    required: true,
    default: null,
    masked: false,
    placeholder: 'myservice',
  }),
})

export const generateRpcCredential = sdk.Action.withInput(
  'generate-rpc-credential',

  async ({ effects }) => ({
    name: 'Generate RPC Credential',
    description:
      'Generate a new random password and set it as the RPC credential. BCHD accepts a ' +
      'single RPC user, so this replaces the current credential and restarts the node.',
    warning:
      'Replaces the existing RPC credential and restarts BCHD. Any wallet or service using ' +
      'the old credential must be updated with the new one, or it will fail to authenticate.',
    allowedStatuses: 'any',
    group: 'Credentials',
    visibility: 'enabled',
  }),

  spec,

  async ({ effects }) => ({
    name: undefined as string | undefined,
    username: undefined as string | undefined,
  }),

  async ({ effects, input }) => {
    const { name, username } = input

    // Generate a random 32-character password
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = ''
    const bytes = new Uint8Array(32)
    globalThis.crypto.getRandomValues(bytes)
    for (const b of bytes) {
      password += chars[b % chars.length]
    }

    // BCHD authenticates a single RPC user (--rpcuser/--rpcpass), which main.ts
    // reads from rpcCredentials[0]. Replace the credential (rather than append a
    // non-functional extra) and restart so BCHD picks up the new password.
    await storeJson.merge(effects, {
      rpcCredentials: [{ name, username, password }],
      rpcUser: username,
      rpcPassword: password,
    })
    await effects.restart()

    return {
      version: '1' as const,
      title: `RPC Credential: ${name}`,
      message: [
        'Credential saved and BCHD restarted. View it anytime in **View RPC Credentials**.',
        '',
        `**Name:** ${name}`,
        `**Username:** ${username}`,
        `**Password:** ${password}`,
      ].join('\n'),
      result: {
        type: 'single' as const,
        value: password,
        copyable: true,
        qr: false,
        masked: false,
      },
    }
  },
)
