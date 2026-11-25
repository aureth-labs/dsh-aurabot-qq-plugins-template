# AuraBot 插件模板仓库

一个仓库放多个插件，push 之后 GitHub Actions 自动构建、发 Release、把产物地址回写到 `package.json`。

## 用法

1. 点右上角 **Use this template**（或 fork / 下载 zip）
2. 改两处：
   - `modules/hello/package.json`、`modules/ping/package.json` 里的 `name`：只写包名（如 `hello`），**不用加用户名前缀**
   - `author`、`description`、`displayName` 等
3. push 到 `main`，Actions 会自动构建这两个插件
4. 想加插件：复制 `modules/hello/` 整个目录，改名、改 `package.json`
5. 想删插件：直接删目录，索引里自然消失

## 插件长什么样

和 Koishi 一样：`name`、`config`、`apply(ctx, config)` 三个具名导出，没有默认导出。

```ts
import { Schema } from '@aurabot/plugin-api'

export const name = 'hello'

export const config = Schema.object({
  greeting: Schema.string().default('你好').description('问候语'),
})

export function apply(ctx, config) {
  ctx.command('hello <text:string>').action(async ({ session }, text) => {
    await session.send(`${config.greeting}，${text}`)
  })

  ctx.server.get('/info', () => ({ ok: true, greeting: config.greeting }))
}
```

`ctx` 是插件级上下文，`session` 是消息级上下文；`ctx.command` 用户直接触发，`ctx.tool` 交给模型调用。
面板要拿数据就用 `ctx.server.get()` / `ctx.server.post()`，和 Koishi 一样是 HTTP 服务，不是另造一套路由。
正式接口见文档站的「插件接口 v2」。

> 示例里的 `src/plugin-api.ts` **不是插件**，是 `@aurabot/plugin-api` 的本地替身：
> 官方那个包只放 `Schema` 构造器和 `Ctx` 类型，还没发布，所以先复制一份进模块，
> 保证示例能编译、能跑测试。发布后删掉这个文件，把 import 换成正式包即可。

## 目录

```
.github/workflows/release.yml   # 构建 + 发 Release + 回写 artifact
scripts/release.mjs             # 上面那个 workflow 调用的脚本
modules/hello/                  # 示例：指令 + AI 工具 + 面板路由
modules/ping/                   # 示例：指令 + AI 工具 + 面板路由
```

每个模块：

```
modules/<name>/
├─ package.json      # 唯一清单：name / version / aurabot 段
├─ tsconfig.json     # 后台：NodeNext，src → lib
├─ tsconfig.client.json  # 面板：client → dist
├─ src/index.ts      # 入口：export const name / config + export function apply
├─ src/plugin-api.ts # 临时替身：等 @aurabot/plugin-api 发布后删掉
├─ client/panel.ts   # 面板源码，编译成 dist/panel.js
├─ test/             # 不进发布包
├─ README.md
└─ LICENSE
```

## 本地开发

```bash
cd modules/hello
npm install
npm run build      # tsc → lib/
npm test
```

## 发版

改 `modules/<name>/package.json` 的 `version`（`1.0.0` → `1.0.1`），push 即可。

产物地址写在 `package.json` 的 `aurabot.artifact` 里，不要手改。

`.aurabot/` 是本地/CI 的构建缓存，**故意不进仓库**：别人 fork 或 Use this template 之后，
第一次构建会照常打包、把 `artifact` 改成他自己仓库的地址，不会因为继承了旧状态而被跳过。

本地预览打包（不发 Release、不提交）：

```bash
npm run dry-run
```

## 依赖

第三方库必须在构建期打进 `lib/`（例如 esbuild `bundle: true`），运行时不装 `node_modules`。
打不进单文件的（wasm / 原生模块）走「首次运行下载固定版本」，并在 README 写明地址和 sha256。

## 许可

模板本身 MIT。你写的插件用自己的 LICENSE，记得改 `modules/<name>/LICENSE`。

