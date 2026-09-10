import type { Message, MessageHandler, OriginPattern } from './types'
import { isTrustedOrigin, log } from './utils'

/**
 * 检查是否为有效消息格式（SDK 或原生）
 */
function isValidMessage(data: any): boolean {
  const valid = data && typeof data === 'object' && (data.type || data.action)
  if (!valid && data) {
    log.bridge('无效消息格式: %O', data)
  }
  return valid
}

/**
 * 清理消息，移除不可序列化的内容（如函数）
 */
function cleanMessage(message: Message): Message {
  return JSON.parse(JSON.stringify(message))
}

/**
 * 创建 postMessage 通信器
 * 本质：封装 window.postMessage 和 window.addEventListener('message')
 */
export function createMessenger(options: {
  isChild: boolean
  iframe?: HTMLIFrameElement
  origin?: string
  allowedOrigins?: OriginPattern[]
}) {
  return options.isChild
    ? createChildMessenger(options.allowedOrigins!)
    : createParentMessenger(options.iframe!, options.origin!)
}

/**
 * 父应用通信器
 * 向 iframe 发送消息，接收 iframe 的消息
 */
function createParentMessenger(iframe: HTMLIFrameElement, childOrigin: string) {
  let onMessage: MessageHandler | undefined
  let destroyed = false

  log.bridge('[Parent] 创建通信器, origin=%s, iframe=%s', childOrigin, iframe?.id || iframe?.src)

  const handleMessageEvent = (event: MessageEvent) => {
    log.bridge('[Parent] 收到消息: origin=%s, expected=%s, sourceMatch=%s, data=%O',
      event.origin, childOrigin, event.source === iframe.contentWindow, event.data)

    if (destroyed || !onMessage) {
      log.bridge('[Parent] 跳过: destroyed=%s, hasHandler=%s', destroyed, !!onMessage)
      return
    }
    if (event.origin !== childOrigin) {
      log.bridge('[Parent] origin 不匹配: %s !== %s', event.origin, childOrigin)
      return
    }
    if (event.source !== iframe.contentWindow) {
      log.bridge('[Parent] source 不是目标 iframe')
      return
    }
    if (!isValidMessage(event.data)) {
      return
    }

    log.bridge('[Parent] ✓ 消息验证通过: %O', event.data)
    onMessage(event.data)
  }

  const send = (message: Message) => {
    log.bridge('[Parent] 发送: %O -> %s', message, childOrigin)

    if (destroyed) return
    if (!iframe.contentWindow) throw new Error('Iframe not available')

    try {
      iframe.contentWindow.postMessage(cleanMessage(message), childOrigin)
      log.bridge('[Parent] ✓ 已发送: %s', message.type)
    } catch (e) {
      log.bridge('[Parent] ✗ 发送异常: %O', e)
      throw e
    }
  }

  return {
    isChild: false,
    init: (handler: MessageHandler) => {
      log.bridge('[Parent] 开始监听 message 事件')
      onMessage = handler
      window.addEventListener('message', handleMessageEvent)
    },
    send,
    destroy: () => {
      log.bridge('[Parent] 销毁通信器')
      if (destroyed) return
      window.removeEventListener('message', handleMessageEvent)
      onMessage = undefined
      destroyed = true
    }
  }
}

/**
 * 子应用通信器
 * 向父窗口发送消息，接收父窗口的消息
 */
function createChildMessenger(allowedOrigins: OriginPattern[]) {
  let onMessage: MessageHandler | undefined
  let destroyed = false
  let parentOrigin: string | undefined

  log.bridge('[Child] 创建通信器, allowed=%O, inIframe=%s, origin=%s',
    allowedOrigins.map(o => o.toString()), window !== window.parent, window.location.origin)

  const handleMessageEvent = (event: MessageEvent) => {
    log.bridge('[Child] 收到消息: origin=%s, parentOrigin=%s, data=%O',
      event.origin, parentOrigin, event.data)

    if (destroyed || !onMessage) {
      log.bridge('[Child] 跳过: destroyed=%s, hasHandler=%s', destroyed, !!onMessage)
      return
    }

    if (event.source !== window.parent) {
      log.bridge('[Child] source 不是父窗口')
      return
    }

    const trusted = isTrustedOrigin(event.origin, allowedOrigins)
    if (!trusted) {
      log.bridge('[Child] origin 不可信: %s', event.origin)
      return
    }

    if (!isValidMessage(event.data)) {
      return
    }

    // 记录父窗口的 origin（首次通信时确定）
    if (!parentOrigin) {
      parentOrigin = event.origin
      log.bridge('[Child] 记录父窗口 origin: %s', parentOrigin)
    }

    log.bridge('[Child] ✓ 消息验证通过: %O', event.data)
    onMessage(event.data)
  }

  const send = (message: Message) => {
    // 父源未知时仅发送握手消息，业务消息不能使用通配目标。
    if (message.type !== 'READY' && !parentOrigin) return
    const targetOrigin = message.type === 'READY' ? '*' : parentOrigin!

    log.bridge('[Child] 发送: %O -> %s', message, targetOrigin)

    if (destroyed || !window.parent) {
      log.bridge('[Child] 发送失败: destroyed=%s, hasParent=%s', destroyed, window.parent !== window)
      return
    }

    try {
      window.parent.postMessage(cleanMessage(message), targetOrigin)
      log.bridge('[Child] ✓ 已发送: %s', message.type)
    } catch (e) {
      log.bridge('[Child] ✗ 发送异常: %O', e)
      throw e
    }
  }

  return {
    isChild: true,
    init: (handler: MessageHandler) => {
      log.bridge('[Child] 开始监听 message 事件')
      onMessage = handler
      window.addEventListener('message', handleMessageEvent)
    },
    send,
    destroy: () => {
      log.bridge('[Child] 销毁通信器')
      if (destroyed) return
      window.removeEventListener('message', handleMessageEvent)
      onMessage = undefined
      destroyed = true
    }
  }
}
