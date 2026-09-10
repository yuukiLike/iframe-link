import createDebug from 'debug'
import type { createMessenger } from './channelBridge'
import type { AnyFunction, OriginPattern } from './types'

type Messenger = ReturnType<typeof createMessenger>

/**
 * 日志命名空间
 *
 * 启用方式：
 * - 浏览器: localStorage.debug = 'iframe-link:*'
 * - 只看特定模块: localStorage.debug = 'iframe-link:bridge'
 * - 查看时间戳: Chrome DevTools → Console → 设置 → Show timestamps
 */
const NAMESPACE = 'iframe-link'

// 预创建常用模块的日志器
export const log = {
  bridge: createDebug(`${NAMESPACE}:bridge`),
  channel: createDebug(`${NAMESPACE}:channel`),
  rpc: createDebug(`${NAMESPACE}:rpc`),
  event: createDebug(`${NAMESPACE}:event`),
  utils: createDebug(`${NAMESPACE}:utils`)
}

/**
 * 运行时启用 debug（用于 debug: true 配置）
 */
export function enableDebug() {
  createDebug.enable(`${NAMESPACE}:*`)
}

/**
 * 运行时禁用 debug
 */
export function disableDebug() {
  createDebug.disable()
}

/**
 * 检查 origin 是否可信
 */
export function isTrustedOrigin(origin: string, allowed: OriginPattern[]): boolean {
  const result = allowed.some(pattern => {
    if (pattern === '*') return true
    if (pattern instanceof RegExp) {
      const matcher = pattern.global || pattern.sticky
        ? new RegExp(pattern.source, pattern.flags)
        : pattern
      return matcher.test(origin)
    }
    return pattern === origin
  })

  log.utils('isTrustedOrigin: %s -> %s %O', origin, result ? '✓' : '✗', allowed.map(p => p.toString()))

  return result
}

/**
 * 生成 UUID（兼容旧环境）
 */
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}

/**
 * RPC 远程调用管理
 */
class RPC {
  private destroyed = false
  private pending = new Map<string, {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }>()

  constructor(
    private messenger: Messenger,
    private methods: Record<string, AnyFunction>
  ) {
    log.rpc('创建 RPC 管理器, methods: %O', Object.keys(methods))
  }

  call(name: string, params?: any): Promise<any> {
    if (this.destroyed) return Promise.reject(new Error('Destroyed'))

    return new Promise((resolve, reject) => {
      const id = uuid()
      log.rpc('发起调用: %s, id=%s, params=%O', name, id, params)
      this.pending.set(id, { resolve, reject })
      try {
        this.messenger.send({ type: 'CALL', id, method: name, params })
      } catch (error) {
        this.pending.delete(id)
        reject(error)
      }
    })
  }

  async execute(id: string, name: string, params: any) {
    log.rpc('执行方法: %s, id=%s, params=%O', name, id, params)

    // 避免原型链污染（如 valueOf、constructor 等）
    if (!Object.prototype.hasOwnProperty.call(this.methods, name)) {
      log.rpc('方法不存在: %s', name)
      this.messenger.send({ type: 'RESULT', id, error: `Method not found: ${name}` })
      return
    }

    try {
      const result = await this.methods[name](params)
      log.rpc('✓ 方法执行成功: %s, result=%O', name, result)
      this.messenger.send({ type: 'RESULT', id, result })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.rpc('✗ 方法执行失败: %s, error=%s', name, message)
      this.messenger.send({ type: 'RESULT', id, error: message })
    }
  }

  resolve(id: string, result: any, error?: string) {
    const p = this.pending.get(id)
    if (!p) {
      log.rpc('未找到待处理的调用: %s', id)
      return
    }

    this.pending.delete(id)
    if (error !== undefined) {
      log.rpc('调用返回错误: id=%s, error=%s', id, error)
      p.reject(new Error(error))
    } else {
      log.rpc('调用返回成功: id=%s, result=%O', id, result)
      p.resolve(result)
    }
  }

  cleanup() {
    this.destroyed = true
    log.rpc('清理 RPC, pending=%d', this.pending.size)
    this.pending.forEach(({ reject }) => reject(new Error('Destroyed')))
    this.pending.clear()
  }
}

export function createRPC(messenger: Messenger, methods: Record<string, AnyFunction>) {
  return new RPC(messenger, methods)
}

/**
 * 事件系统 - 发布订阅模式
 */
export function createEvent(messenger: Messenger) {
  const handlers = new Map<string, Set<(data: any) => void>>()

  return {
    on: (type: string, fn: (data: any) => void) => {
      if (!handlers.has(type)) handlers.set(type, new Set())
      handlers.get(type)!.add(fn)
      log.event('订阅事件: %s, handlers=%d', type, handlers.get(type)!.size)
    },

    off: (type: string, fn: (data: any) => void) => {
      handlers.get(type)?.delete(fn)
      log.event('取消订阅: %s', type)
    },

    emit: (type: string, data?: any) => {
      log.event('发送事件: %s, data=%O', type, data)
      messenger.send({ type: 'EVENT', eventType: type, data })
    },

    dispatch: (type: string, data: any) => {
      const set = handlers.get(type)
      const count = set ? set.size : 0
      log.event('分发事件: %s, handlers=%d, data=%O', type, count, data)
      if (set) set.forEach(fn => fn(data))
    },

    cleanup: () => {
      log.event('清理事件系统')
      handlers.clear()
    }
  }
}
