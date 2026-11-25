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

## 目录

```
.github/workflows/release.yml   # 构建 + 发 Release + 回写 artifact
scripts/release.mjs             # 上面那个 workflow 调用的脚本
modules/hello/                  # 示例：注册一个 AI 工具
modules/ping/                   # 示例：注册一个 HTTP 路由
```

每个模块：

```
modules/<name>/
├─ package.json      # 唯一清单：name / version / aurabot 段
├─ tsconfig.json     # 后台：NodeNext，src → lib
├─ tsconfig.client.json  # 面板：client → dist
├─ src/index.ts      # 入口，默认导出插件对象
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

脚本只构建版本号变过的模块；产物地址写在 `package.json` 的 `aurabot.artifact` 里，不要手改。
`.aurabot/versions.json` 由首次 CI 构建自动生成并提交，记录已发布的版本，别加进 `.gitignore`。

本地预览打包（不发 Release、不提交）：

```bash
npm run dry-run
```

## 依赖

第三方库必须在构建期打进 `lib/`（例如 esbuild `bundle: true`），运行时不装 `node_modules`。
打不进单文件的（wasm / 原生模块）走「首次运行下载固定版本」，并在 README 写明地址和 sha256。

## 许可

模板本身 MIT。你写的插件用自己的 LICENSE，记得改 `modules/<name>/LICENSE`。

