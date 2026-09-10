import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMessenger } from '../../src/channelBridge'

const parentOrigin = 'https://parent.example'

function setup(isChild = true) {
  const peer = { postMessage: vi.fn() }
  const host = Object.assign(new EventTarget(), {
    parent: peer,
    location: { origin: 'https://child.example' }
  })
  vi.stubGlobal('window', host)
  const iframe = { contentWindow: peer } as unknown as HTMLIFrameElement
  const messenger = createMessenger({
    isChild,
    iframe,
    origin: parentOrigin,
    allowedOrigins: [parentOrigin]
  })
  const receive = (data: object, source: object = peer, origin = parentOrigin) => {
    host.dispatchEvent(Object.assign(new Event('message'), { data, source, origin }))
  }
  return { messenger, peer, iframe, receive }
}

afterEach(() => vi.unstubAllGlobals())

describe('子端消息边界', () => {
  it('忽略同源其他窗口和未获允许父源，不让它们确定发送目标', () => {
    const { messenger, peer, receive } = setup()
    const handler = vi.fn()
    messenger.init(handler)

    receive({ type: 'ACK' }, {})
    receive({ type: 'CALL', id: 'foreign', method: 'test' }, {})
    receive({ type: 'ACK' }, peer, 'https://untrusted.example')
    messenger.send({ type: 'EVENT', eventType: 'PRIVATE', data: 'secret' })
    expect(handler).not.toHaveBeenCalled()
    expect(peer.postMessage).not.toHaveBeenCalled()

    receive({ type: 'ACK' })
    messenger.send({ type: 'EVENT', eventType: 'READY_TO_USE' })
    expect(handler).toHaveBeenCalledOnce()
    expect(peer.postMessage).toHaveBeenCalledWith(
      { type: 'EVENT', eventType: 'READY_TO_USE' }, parentOrigin
    )
    messenger.destroy()
  })

  it('父源未知时只发送 READY，不发送业务事件', () => {
    const { messenger, peer } = setup()
    messenger.send({ type: 'READY' })
    messenger.send({ type: 'EVENT', eventType: 'PRIVATE', data: 'secret' })
    expect(peer.postMessage).toHaveBeenCalledTimes(1)
    expect(peer.postMessage).toHaveBeenCalledWith({ type: 'READY' }, '*')
  })
})

describe.each([false, true])('发送失败向上传递（isChild=%s）', isChild => {
  it('序列化失败后仍能发送下一条合法消息', () => {
    const { messenger, peer, receive } = setup(isChild)
    messenger.init(vi.fn())
    if (isChild) receive({ type: 'ACK' })
    const circular: { self?: unknown } = {}
    circular.self = circular

    expect(() => messenger.send({ type: 'CALL', params: circular })).toThrow(TypeError)
    expect(peer.postMessage).not.toHaveBeenCalled()
    messenger.send({ type: 'CALL', params: 'ok' })
    expect(peer.postMessage).toHaveBeenCalledWith({ type: 'CALL', params: 'ok' }, parentOrigin)
    messenger.destroy()
  })

  it('postMessage 失败时保留原始错误', () => {
    const { messenger, peer, receive } = setup(isChild)
    messenger.init(vi.fn())
    if (isChild) receive({ type: 'ACK' })
    const error = new Error('postMessage failed')
    peer.postMessage.mockImplementation(() => { throw error })
    expect(() => messenger.send({ type: 'CALL' })).toThrow(error)
    messenger.destroy()
  })
})

it('iframe 已移除时发送立即失败', () => {
  const { messenger, iframe } = setup(false)
  Object.defineProperty(iframe, 'contentWindow', { value: null })
  expect(() => messenger.send({ type: 'CALL' })).toThrow('Iframe not available')
})
