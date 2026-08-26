/**
 * iframe-rpc-kit - Promise-based iframe communication SDK
 *
 * Parent app example:
 * ```ts
 * import { connectToIframe } from 'iframe-rpc-kit'
 *
 * const channel = connectToIframe({
 *   iframe: '#myIframe',
 *   origin: 'https://child.com',
 *   methods: { getData: async (params) => ({ success: true, params }) }
 * })
 *
 * const remote = await channel.promise
 * await remote.childMethod()
 * channel.on('DATA_UPDATED', (data) => { ... })
 * ```
 *
 * Child app example:
 * ```ts
 * import { connectToParent } from 'iframe-rpc-kit'
 *
 * const channel = connectToParent({
 *   allowedOrigins: ['https://parent.com'],
 *   methods: { childMethod: async () => ({ data: 'ok' }) }
 * })
 *
 * const remote = await channel.promise
 * await remote.getData({ id: '123' })
 * channel.emit('DATA_UPDATED', { id: '123' })
 * ```
 */

export { connectToIframe, connectToParent } from './channelConnect'
export type {
  IframeChannel,
  Message,
  NativeMessage,
  NativeResponse,
  ConnectOptions,
  ConnectToIframeOptions,
  ConnectToParentOptions,
  SDKMessageType,
  OriginPattern
} from './types'
export { SDK_MESSAGE_TYPES, DEFAULT_ALLOWED_ORIGIN } from './types'
