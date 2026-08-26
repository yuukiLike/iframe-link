import type {
  IframeChannel,
  Message,
  NativeMessage,
  NativeResponse,
  ConnectToIframeOptions,
  ConnectToParentOptions,
  AnyFunction,
} from "./types";
import { SDK_MESSAGE_TYPES, DEFAULT_ALLOWED_ORIGIN } from "./types";
import { createMessenger } from "./channelBridge";
import { createRPC, createEvent, log, enableDebug } from "./utils";

/**
 * 检测是否为 SDK 协议消息（有 type 字段且是已知类型）
 */
function isSDKMessage(message: any): message is Message {
  return (
    message &&
    typeof message === "object" &&
    "type" in message &&
    SDK_MESSAGE_TYPES.includes(message.type)
  );
}

/**
 * 检测是否为原生 postMessage 消息（有 action 字段，无 SDK type）
 */
function isNativeMessage(message: any): message is NativeMessage {
  return (
    message &&
    typeof message === "object" &&
    "action" in message &&
    !isSDKMessage(message) &&
    !("success" in message)
  ); // 排除响应消息
}

/**
 * 创建通信通道
 *
 * 握手流程（Handshake）：
 * 1. 子应用加载完成后，发送 READY 消息
 * 2. 父应用收到 READY，回复 ACK 消息，并完成握手
 * 3. 子应用收到 ACK，完成握手
 * 4. 双方握手完成后，可以进行 RPC 调用和事件通信
 */
function createChannel<T = any>(options: {
  messenger: ReturnType<typeof createMessenger>;
  methods?: Record<string, AnyFunction>;
  debug?: boolean;
}): IframeChannel<T> {
  const { messenger, methods = {}, debug = false } = options;
  const role = messenger.isChild ? "Child" : "Parent";

  // 如果传入 debug: true，运行时启用日志
  if (debug) {
    enableDebug();
  }

  log.channel('[%s] 创建通信通道, methods=%O', role, Object.keys(methods));

  const rpc = createRPC(messenger, methods);
  const event = createEvent(messenger);

  // 握手状态：等待对方确认连接
  let resolveHandshake: ((remote: T) => void) | undefined;
  const handshakePromise = new Promise<T>((resolve) => {
    resolveHandshake = resolve;
  });

  // 开始监听消息
  messenger.init(handleMessage);
  log.channel('[%s] 消息监听已初始化', role);

  // 重试配置
  const RETRY_INTERVAL = 1000;  // 重试间隔 1 秒
  const MAX_RETRIES = 5;        // 最多重试 5 次
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setInterval> | null = null;

  // 子应用主动发起握手（带重试机制）
  if (messenger.isChild) {
    const sendReady = () => {
      retryCount++;
      log.channel('[%s] 发送 READY (%d/%d)', role, retryCount, MAX_RETRIES);
      messenger.send({ type: "READY" });

      // 超过最大重试次数，停止重试
      if (retryCount >= MAX_RETRIES) {
        if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
        log.channel('[%s] ✗ 握手超时，已重试 %d 次', role, MAX_RETRIES);
      }
    };

    // 立即发送第一次
    sendReady();

    // 设置重试定时器
    retryTimer = setInterval(sendReady, RETRY_INTERVAL);
  } else {
    log.channel('[%s] 等待子应用 READY', role);
  }

  /**
   * 构建原生响应消息
   */
  function createNativeResponse(
    action: string,
    requestId?: string,
    result?: any,
    error?: string
  ): NativeResponse {
    return {
      type: "__NATIVE_RESPONSE__",
      action,
      requestId,
      success: !error,
      result,
      error,
    };
  }

  /**
   * 处理收到的消息
   */
  function handleMessage(message: Message | NativeMessage) {
    log.channel('[%s] handleMessage: %O', role, message);
    if (isSDKMessage(message)) {
      handleSDKMessage(message);
    } else if (isNativeMessage(message)) {
      handleNativeMessage(message);
    } else {
      log.channel('[%s] 未知消息类型，忽略', role);
    }
  }

  /**
   * 处理 SDK 协议消息
   */
  function handleSDKMessage(message: Message) {
    log.channel('[%s] SDK 消息: %s %O', role, message.type, message);

    switch (message.type) {
      case "READY":
        // 父应用收到子应用的 READY，回复 ACK 并完成握手
        if (!messenger.isChild) {
          log.channel('[%s] 收到 READY，回复 ACK', role);
          messenger.send({ type: "ACK" });
          finishHandshake();
        }
        break;
      case "ACK":
        // 子应用收到父应用的 ACK，完成握手
        if (messenger.isChild) {
          log.channel('[%s] 收到 ACK，握手完成', role);
          finishHandshake();
        }
        break;
      case "CALL":
        log.channel('[%s] RPC 调用: %s', role, message.method);
        rpc.execute(message.id!, message.method!, message.params);
        break;
      case "RESULT":
        log.channel('[%s] RPC 结果: id=%s', role, message.id);
        rpc.resolve(message.id!, message.result, message.error);
        break;
      case "EVENT":
        log.channel('[%s] 事件: %s', role, message.eventType);
        event.dispatch(message.eventType!, message.data);
        break;
    }
  }

  /**
   * 处理原生 postMessage 消息（给不使用 SDK 的子应用）
   */
  async function handleNativeMessage(message: NativeMessage) {
    const { action, data, requestId } = message;
    log.channel('[%s] Native 消息: %s', role, action);

    // 检查方法是否存在（避免原型链污染）
    if (!Object.prototype.hasOwnProperty.call(methods, action)) {
      messenger.send(
        createNativeResponse(
          action,
          requestId,
          undefined,
          `Method not found: ${action}`
        ) as any
      );
      return;
    }

    try {
      const result = await methods[action](data);
      messenger.send(createNativeResponse(action, requestId, result) as any);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      messenger.send(
        createNativeResponse(action, requestId, undefined, error) as any
      );
    }
  }

  /**
   * 完成握手，创建远程调用代理
   */
  function finishHandshake() {
    if (!resolveHandshake) {
      log.channel('[%s] finishHandshake: 已完成，忽略', role);
      return;
    }

    // 停止重试定时器
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }

    log.channel('[%s] ✓ 握手完成 (第 %d 次尝试)', role, retryCount);

    // 创建远程方法代理：remote.methodName(params) -> RPC 调用
    const remote = new Proxy(
      {},
      {
        get: (_, name) => {
          // 排除 Promise 相关属性，避免被当作 thenable
          if (name === "then" || name === "catch" || name === "finally") {
            return undefined;
          }
          return typeof name === "string"
            ? (params?: any) => rpc.call(name, params)
            : undefined;
        },
      }
    ) as T;

    resolveHandshake(remote);
    resolveHandshake = undefined;
  }

  return {
    promise: handshakePromise,
    on: event.on,
    off: event.off,
    emit: event.emit,
    destroy: () => {
      log.channel('[%s] 销毁通道', role);
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
      rpc.cleanup();
      event.cleanup();
      messenger.destroy();
    },
  };
}

/**
 * 父应用：连接到 iframe 子应用
 */
export function connectToIframe<T = any>(
  options: ConnectToIframeOptions
): IframeChannel<T> {
  const { iframe, origin, methods, debug } = options;

  log.channel('connectToIframe: iframe=%s, origin=%s, debug=%s', iframe, origin, debug);

  const el =
    typeof iframe === "string"
      ? document.querySelector<HTMLIFrameElement>(iframe)
      : iframe;

  if (!el) {
    log.channel('✗ Iframe 未找到: %s', iframe);
    throw new Error("Iframe not found");
  }
  if (!origin) {
    log.channel('✗ Origin 缺失');
    throw new Error("Origin is required");
  }

  log.channel('创建父应用通道: origin=%s, src=%s', origin, el.src);
  const messenger = createMessenger({ isChild: false, iframe: el, origin });
  return createChannel<T>({ messenger, methods, debug });
}

/**
 * 子应用：连接到父窗口
 */
export function connectToParent<T = any>(
  options: ConnectToParentOptions = {}
): IframeChannel<T> {
  const { allowedOrigins = [DEFAULT_ALLOWED_ORIGIN], methods, debug } = options;

  log.channel('connectToParent: allowed=%O, debug=%s', allowedOrigins.map(o => o.toString()), debug);

  const messenger = createMessenger({ isChild: true, allowedOrigins });
  return createChannel<T>({ messenger, methods, debug });
}
