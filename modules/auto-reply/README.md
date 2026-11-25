# 关键词自动回复（示例）

比 `bv-parse` 多两件事：**有自己的面板**，**规则存在配置里**。

- 中间件：命中规则就直接回，不消耗模型（`alsoToModel` 打开才继续交给模型）
- 面板：加/删/改规则，保存后写回模块配置
- 接口：`GET /rules` 列出规则与正则编译错误，`POST /test` 拿一段话试匹配

```text
modules/auto-reply/
  src/index.ts          插件本体（中间件 + 两个接口）
  src/plugin-api.ts     接口替身（正式包发布后删掉）
  client/panel.ts       面板源码，build 时编成 dist/panel.js
  test/                 单测，不进发布包
```

面板读的是 `settings.rules`，保存用 `save({ rules })`；`call('/test', { text })` 打自己的 POST 接口。
正则写错不会抛异常，只会不命中，错误信息显示在对应那行的提示里。
