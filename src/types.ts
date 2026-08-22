export type AnyFunction = (...args: any[]) => any
export type MessageHandler = (message: Message | NativeMessage) => void

/**
 * SDK 协议消息类型
 */
export const SDK_MESSAGE_TYPES = ['READY', 'ACK', 'CALL', 'RESULT', 'EVENT'] as const
export type SDKMessageType = typeof SDK_MESSAGE_TYPES[number]

/**
 * 标准 SDK 消息格式
 */
export interface Message {
  type: SDKMessageType
  id?: string
  method?: string
  params?: any
  result?: any
  error?: string
  eventType?: string
  data?: any
}

/**
 * 原生消息格式（给不使用 SDK 的子应用）
 * 子应用可以直接使用 postMessage 发送此格式的消息
 */
export interface NativeMessage {
  action: string
  data?: any
  requestId?: string
}

/**
 * 原生响应格式
 */
export interface NativeResponse {
  type: '__NATIVE_RESPONSE__'
  action: string
  requestId?: string
  success: boolean
  result?: any
  error?: string
}

export interface IframeChannel<T = any> {
  promise: Promise<T>
  on: (type: string, fn: (data: any) => void) => void
  off: (type: string, fn: (data: any) => void) => void
  emit: (type: string, data?: any) => void
  destroy: () => void
}

/**
 * Origin 匹配规则
 * - string: 精确匹配
 * - RegExp: 正则匹配
 * - '*': 匹配所有（不推荐用于生产环境）
 */
export type OriginPattern = string | RegExp

/**
 * 默认允许的示例 Origin；生产环境应显式配置 allowedOrigins
 */
export const DEFAULT_ALLOWED_ORIGIN = /^https:\/\/oa\.example\.com$/

export interface ConnectOptions {
  iframe?: string | HTMLIFrameElement
  origin?: string
  allowedOrigins?: OriginPattern[]
  methods?: Record<string, AnyFunction>
  debug?: boolean
}
