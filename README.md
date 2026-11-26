# AuraBot 插件模板仓库

一个仓库放多个插件，push 之后 GitHub Actions 自动构建、发 Release、把产物地址回写到 `package.json`。

## 用法

1. 点右上角 **Use this template**（或 fork / 下载 zip）
2. 改两处：
   - `modules/hello/package.json`、`modules/ping/package.json` 里的 `name`：只写包名（如 `hello`），**不用加用户名前缀**
   - `author`、`description`、`displayName` 等
3. push 到 `main`，Actions 会自动构建这两个插件
4. 想加插件：复制 `modules/hello/` 整个目录，改名、改 `package.json`；只用指令和中间件、不要面板的话，照 `modules/bv-parse/` 抄更省事
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

> `apply(ctx, config)` 收到的 `config` 是**启动那一刻的快照**。面板保存设置后宿主只发 `config` 事件、
> 不会重载插件，所以要在回调里重新读一次 `ctx.settings()`（见 `modules/auto-reply`），
> 别把快照存到闭包里然后用一辈子。

> 示例里的 `src/plugin-api.ts` **不是插件**，是 `@aurabot/plugin-api` 的本地替身：
> 官方那个包只放 `Schema` 构造器和 `Ctx` 类型，还没发布，所以先复制一份进模块，
> 保证示例能编译、能跑测试。发布后删掉这个文件，把 import 换成正式包即可。

## 目录

```
.github/workflows/release.yml   # 构建 + 发 Release + 回写 artifact
scripts/release.mjs             # 上面那个 workflow 调用的脚本
modules/hello/                  # 示例：指令 + AI 工具 + 面板路由
modules/ping/                   # 示例：指令 + AI 工具 + 面板路由
modules/bv-parse/               # 示例：中间件抢在模型前拦消息 + 同名指令，无面板
modules/auto-reply/             # 示例：关键词自动回复，带自己的面板与 GET/POST 接口
modules/remind/                 # 示例：给模型的工具 + 指令 + 随卸载自动清的定时器
modules/mock-adapter/           # 示例：适配器即插件——注册一个不联网的平台，HTTP 注入消息
```

## 适配器也是插件

想让框架接入一个新平台，不用改宿主：写一个普通插件，调 `ctx.adapter(spec)` 就行。

```ts
export function apply(ctx) {
  ctx.adapter({
    platform: 'discord',
    name: 'Discord',
    capabilities: ['text', 'at', 'image'],

    async connect(config, runtime) {
      // 连上平台，返回一个 bot；之后收到消息就 runtime.emitMessage(…)
      const bot = await loginToDiscord(config.token, {
        onMessage: (raw) => runtime.emitMessage({
          type: raw.guildId ? 'group' : 'private',
          channelId: raw.channelId,
          userId: raw.authorId,
          userName: raw.authorName,
          content: raw.text,
          raw,
        }),
      })
      return {
        id: bot.userId,
        platform: 'discord',
        selfId: bot.userId,
        status: 'online',
        supports: (capability) => ['text', 'at', 'image'].includes(capability),
        sendMessage: (channelId, content) => bot.send(channelId, content),
        sendPrivateMessage: (userId, content) => bot.dm(userId, content),
      }
    },
  })
}
```

宿主负责的、适配器不用管的部分：试运行闸门、`<voice>` 语音合成、平台发不了的元素降级、
`ctx.bots` 注册与上线/下线事件、模块卸载时断开。

`modules/mock-adapter` 是一个能直接跑的最小实现：`POST /inject` 模拟平台消息，
`GET /outbox` 看它发了什么，指令 `whoami` 证明业务插件不认识具体平台。

## 一份插件多份配置（实例）

清单里写 `aurabot.reusable: true`（适配器默认就是 true），同一份代码就能跑多份配置——
典型场景是同一个平台接两个账号。用户配置长这样，宿主按 `ext.<id>.instances` 逐个调
`apply(ctx, config)`：

```json
{
  "ext": {
    "mock-adapter": {
      "platform": "mock",
      "instances": [
        { "id": "second", "config": { "platform": "mock2" } }
      ]
    }
  }
}
```

- `id` 是实例名（字母或数字开头，可用 `-` 和 `_`）；不写 instances 就只有主实例
- `config` 只写和主配置不一样的值，宿主按「主配置 + 实例覆盖」合并后传给 `apply`
- 每个实例各有自己的 `ctx.settings()`、`ctx.dataDir()` 和路由前缀 `/ext/<id>/i/<实例名>`
- 面板「扩展」页会给 `reusable` 的插件自动出实例卡片（加 / 删 / 启停）

插件里的 `ctx.adapter()` 不用为多实例写特例：宿主本来就会为每个实例各调一次 `apply`，
你只要保证 `connect()` 用的是传进来的 `config`。

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

开发期可以开两个终端：`npx tsc -p tsconfig.json -w` 守着编译，宿主那边
`modules/` 目录里的文件一变就会重载这个模块（不用重启 DeepSeek Harness）。
产物在 `lib/`，HMR 跟的是产物——所以「保存 TS」之后要等 `tsc -w` 落盘那一下。

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

