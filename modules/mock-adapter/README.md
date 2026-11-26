# 示例：演示适配器

演示**适配器就是普通插件**：一个 `ctx.adapter()` + 一个 `InboundMessage` 投递口，
不碰任何平台 SDK 也能把一条消息送进 `command → middleware → llm`。

- `POST /inject`：模拟平台来了一条消息（`{"text":"/whoami"}`）
- `GET /outbox`：看这个 bot 往外发了什么
- 指令 `whoami`：回平台名 / 会话 / 用户，证明业务插件不认识具体平台

真实适配器把 `connect()` 里的假 bot 换成真连接即可（QQ / Discord / Telegram / Satori）。

```text
POST /aurabot/api/ext/mock-adapter/inject   {"text":"/whoami"}
GET  /aurabot/api/ext/mock-adapter/outbox
```
