# AuraBot V2 插件模板

一个目录对应一个可独立安装的插件。开发时从 `@aurabot/plugin-api` 导入类型、Schema、消息元素和 Bot 基类。模板的 `vendor/` 保存与框架同版的 SDK 包，宿主运行时提供这些接口。

## 写第一个指令

```ts
import { Schema, type Ctx } from '@aurabot/plugin-api'

export const name = 'hello'
export const config = Schema.object({ greeting: Schema.string().default('你好') })

export function apply(ctx: Ctx, config: { greeting: string }) {
  ctx.command('hello <text:string>').action(async ({ session }, text) => {
    await session.send(`${config.greeting}，${text}`)
  })
}
```

从 `modules/hello` 复制一份开始，改目录名、`package.json` 的 name 和插件导出的 name。作者只写包名，市场根据来源生成 `owner/name`。配置表单由 Schema 生成。需要展示业务数据时，可以参考 hello 的自定义页面和 HTTP 接口。

## 编译和试运行

```sh
npm --prefix modules/hello install
npm --prefix modules/hello run check
npm --prefix modules/hello run build
npm run dry-run
```

本地开发可把源码包放在 AuraBot 数据目录的 `modules/<name>/`。入口由 package.json 的 main 指定；使用源码热重载时将它设为 `src/index.ts`。保存后宿主重新加载插件并回收原实例的监听和定时器。发行清单的 main 应指向编译产物，例如 `lib/index.js`。

## 选用示例

| 目录 | 可以参考的写法 |
| --- | --- |
| hello | 声明配置、指令、AI 工具和自定义页面 |
| ping | 最短的指令调用路径 |
| auto-reply | 中间件读取当前实例配置 |
| bv-parse | 从入站消息识别视频链接 |
| remind | 按来源平台和 Bot 安排私聊提醒 |
| mock-adapter | 注册 Bot、模拟入站并查看发送记录 |

## 发行

`npm run dry-run` 将 ZIP 写入根目录的 dist。正式发布由仓库工作流根据插件版本生成 Release，并将下载地址、字节数和 SHA-256 写回各包清单。将该清单的稳定链接交给市场收录。
