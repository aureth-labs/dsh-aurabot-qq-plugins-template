# bv-parse（示例）

演示两件事：

- **中间件**：群里有人贴 BV 号，直接回一个可点的链接，不消耗模型
- **指令**：`/bv BV1xx411c7mD` 手动查

```text
modules/bv-parse/
  src/index.ts          插件本体
  src/plugin-api.ts     接口替身（正式包发布后删掉，换成 @aurabot/plugin-api）
  build.mjs             src → lib
```

改完跑 `npm run build`，宿主那边保存即热重载（它只认 `lib/` 的产物）。
