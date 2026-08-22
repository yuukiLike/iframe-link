import { describe, it, expect, vi } from "vitest";
import { isTrustedOrigin, createRPC, createEvent } from "../../src/utils";
import { DEFAULT_ALLOWED_ORIGIN } from "../../src/types";

describe("isTrustedOrigin", () => {
  it("精确匹配时返回 true", () => {
    expect(
      isTrustedOrigin("https://example.com", ["https://example.com"])
    ).toBe(true);
  });

  it("不匹配时返回 false", () => {
    expect(isTrustedOrigin("https://evil.com", ["https://example.com"])).toBe(
      false
    );
  });

  it("通配符 * 匹配任意 origin", () => {
    expect(isTrustedOrigin("https://any-domain.com", ["*"])).toBe(true);
  });

  it("支持多个允许的 origin", () => {
    const allowed = ["https://a.com", "https://b.com", "https://c.com"];
    expect(isTrustedOrigin("https://b.com", allowed)).toBe(true);
    expect(isTrustedOrigin("https://d.com", allowed)).toBe(false);
  });

  it("支持正则表达式匹配", () => {
    const allowed = [/^https:\/\/.*\.example\.com$/];
    expect(isTrustedOrigin("https://sub.example.com", allowed as any)).toBe(
      true
    );
    expect(isTrustedOrigin("https://example.com", allowed as any)).toBe(false);
    expect(
      isTrustedOrigin("https://deep.sub.example.com", allowed as any)
    ).toBe(true);
  });

  it("空白名单时返回 false", () => {
    expect(isTrustedOrigin("https://example.com", [])).toBe(false);
  });

  it("默认规则使用保留的示例域名", () => {
    expect(
      isTrustedOrigin("https://oa.example.com", [DEFAULT_ALLOWED_ORIGIN])
    ).toBe(true);
    expect(
      isTrustedOrigin("https://example.org", [DEFAULT_ALLOWED_ORIGIN])
    ).toBe(false);
    expect(
      isTrustedOrigin("https://oa.example.com.evil.test", [DEFAULT_ALLOWED_ORIGIN])
    ).toBe(false);
  });
});

describe("createRPC", () => {
  const createMockMessenger = () => ({
    isChild: false,
    init: vi.fn(),
    send: vi.fn(),
    destroy: vi.fn(),
  });

  it("调用远程方法并接收结果", async () => {
    const messenger = createMockMessenger();
    const methods = {};
    const rpc = createRPC(messenger, methods);

    // Call remote method
    const callPromise = rpc.call("remoteMethod", { arg: 1 });

    // 从 send 调用中提取实际的 ID（UUID）
    const sentMessage = messenger.send.mock.calls[0][0];
    expect(sentMessage.type).toBe("CALL");
    expect(sentMessage.method).toBe("remoteMethod");
    expect(sentMessage.params).toEqual({ arg: 1 });
    expect(sentMessage.id).toBeDefined();

    // 使用实际 ID 模拟响应
    rpc.resolve(sentMessage.id, { success: true });

    const result = await callPromise;
    expect(result).toEqual({ success: true });
  });

  it("远程方法返回错误时应 reject", async () => {
    const messenger = createMockMessenger();
    const rpc = createRPC(messenger, {});

    const callPromise = rpc.call("failingMethod");

    // 从 send 调用中提取实际的 ID
    const sentMessage = messenger.send.mock.calls[0][0];
    rpc.resolve(sentMessage.id, undefined, "Something went wrong");

    await expect(callPromise).rejects.toThrow("Something went wrong");
  });

  it("执行本地方法", async () => {
    const messenger = createMockMessenger();
    const localMethod = vi.fn().mockResolvedValue({ data: "ok" });
    const rpc = createRPC(messenger, { localMethod });

    await rpc.execute("123", "localMethod", { input: "test" });

    expect(localMethod).toHaveBeenCalledWith({ input: "test" });
    expect(messenger.send).toHaveBeenCalledWith({
      type: "RESULT",
      id: "123",
      result: { data: "ok" },
    });
  });

  it("方法不存在时返回错误", async () => {
    const messenger = createMockMessenger();
    const rpc = createRPC(messenger, {});

    await rpc.execute("123", "nonExistent", {});

    expect(messenger.send).toHaveBeenCalledWith({
      type: "RESULT",
      id: "123",
      error: "Method not found: nonExistent",
    });
  });

  it("方法抛出异常时返回错误", async () => {
    const messenger = createMockMessenger();
    const failingMethod = vi.fn().mockRejectedValue(new Error("Method failed"));
    const rpc = createRPC(messenger, { failingMethod });

    await rpc.execute("123", "failingMethod", {});

    expect(messenger.send).toHaveBeenCalledWith({
      type: "RESULT",
      id: "123",
      error: "Method failed",
    });
  });

  it("销毁时清理所有 pending 调用", async () => {
    const messenger = createMockMessenger();
    const rpc = createRPC(messenger, {});

    const promise1 = rpc.call("method1");
    const promise2 = rpc.call("method2");

    rpc.cleanup();

    await expect(promise1).rejects.toThrow("Destroyed");
    await expect(promise2).rejects.toThrow("Destroyed");
  });
});

describe("createEvent", () => {
  const createMockMessenger = () => ({
    isChild: false,
    init: vi.fn(),
    send: vi.fn(),
    destroy: vi.fn(),
  });

  it("通过 messenger 发送事件", () => {
    const messenger = createMockMessenger();
    const event = createEvent(messenger);

    event.emit("USER_ACTION", { userId: "123" });

    expect(messenger.send).toHaveBeenCalledWith({
      type: "EVENT",
      eventType: "USER_ACTION",
      data: { userId: "123" },
    });
  });

  it("订阅并接收事件", () => {
    const messenger = createMockMessenger();
    const event = createEvent(messenger);
    const handler = vi.fn();

    event.on("NOTIFICATION", handler);
    event.dispatch("NOTIFICATION", { message: "hello" });

    expect(handler).toHaveBeenCalledWith({ message: "hello" });
  });

  it("取消订阅事件", () => {
    const messenger = createMockMessenger();
    const event = createEvent(messenger);
    const handler = vi.fn();

    event.on("NOTIFICATION", handler);
    event.off("NOTIFICATION", handler);
    event.dispatch("NOTIFICATION", { message: "hello" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("同一事件支持多个处理器", () => {
    const messenger = createMockMessenger();
    const event = createEvent(messenger);
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    event.on("EVENT", handler1);
    event.on("EVENT", handler2);
    event.dispatch("EVENT", { data: "test" });

    expect(handler1).toHaveBeenCalledWith({ data: "test" });
    expect(handler2).toHaveBeenCalledWith({ data: "test" });
  });

  it("清理所有事件处理器", () => {
    const messenger = createMockMessenger();
    const event = createEvent(messenger);
    const handler = vi.fn();

    event.on("EVENT1", handler);
    event.on("EVENT2", handler);
    event.cleanup();
    event.dispatch("EVENT1", {});
    event.dispatch("EVENT2", {});

    expect(handler).not.toHaveBeenCalled();
  });
});
