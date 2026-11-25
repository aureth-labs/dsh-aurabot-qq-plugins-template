// src/*.ts → lib/（后台）。
// 没有面板代码，所以不跑 client 那一半；要加面板就照 hello 的 build.mjs 抄。

import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
if (!existsSync(TSC)) throw new Error('没装依赖：先在模块目录跑 npm install')

rmSync(join(ROOT, 'lib'), { recursive: true, force: true })
execFileSync(process.execPath, [TSC, '-p', join(ROOT, 'tsconfig.json')], { stdio: 'inherit' })
console.log('[build] src → lib 完成')
