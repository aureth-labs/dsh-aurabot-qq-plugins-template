# 示例：打招呼

模板里最小的插件，演示三件事：`package.json` 怎么写、`src/index.ts` 怎么注册 AI 工具、面板怎么读自己的路由。

- 工具 `hello_echo`：把模型给的话加上问候语回给它
- 路由 `/info`：面板读当前设置

改 `package.json` 的 `name` 为 `你的GitHub用户名/hello`，再改 `aurabot.displayName`。
