# bv-parse（示例）

演示两件事：

- **中间件**：群里有人贴 BV 号，直接回一个可点的链接，不消耗模型
- **指令**：`/bv BV1xx411c7mD` 手动查

```text
modules/bv-parse/
  src/index.ts          插件本体
  build.mjs             src → lib
```

发行前运行 `npm run build`。开发时可将 main 指向 src/index.ts，保存源码即可重载。
