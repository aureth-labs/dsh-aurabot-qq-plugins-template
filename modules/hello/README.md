# 示例：打招呼

Koishi 形态的最小插件，演示三件事：`package.json` 怎么填、`name` / `config` / `apply` 怎么导出、
面板怎么读自己的路由。

- 指令 `hello <text>`：用户直接触发，回一句问候，不经过模型
- 工具 `hello_echo`：把模型给的话加上问候语回给它
- 路由 `/info`：面板读当前设置

`package.json` 的 `name` 只写包名（如 `hello`），不用加用户名前缀；`aurabot.displayName` 是市场上显示的名字。
