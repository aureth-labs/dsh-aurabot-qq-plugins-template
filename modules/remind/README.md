# 到点提醒（示例）

和前两个示例的差别：**只注册工具与指令，不拦消息**，演示定时器怎么随插件卸载自动清掉。

- 工具 `remind`：模型自己决定调用，参数是 `{ minutes, text }`；用户说「十分钟后提醒我喝水」就会走到这里
- 指令 `/remind 10 喝水`：用户直接触发，不消耗模型
- 到点用 `ctx.bots` 找一台在线机器人发私聊；没有在线的就记一条日志，不重试

```text
modules/remind/
  src/index.ts      插件本体：tool + command + setTimeout
  test/             单测：参数校验、定时器、发送
```

`package.json` 里写了 `aurabot.reloadOnConfig: true`：改上限这类设置保存后模块会重载，
`apply` 里的 config 直接就是新的，不用监听 `config` 事件。
