import test from 'node:test'
import assert from 'node:assert/strict'
import { name, config, apply } from '../lib/index.js'

function boot() {
  const tools = []
  const routes = new Map()
  const commands = new Map()

  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    tool: (spec) => {
      tools.push(spec)
      return () => {}
    },
    route: (path, handler) => {
      routes.set(path, handler)
      return () => {}
    },
    command: (commandName) => {
      const command = {
        description: () => command,
        action: (handler) => {
          commands.set(commandName, handler)
          return command
        },
      }
      return command
    },
  }

  apply(ctx)
  return { tools, routes, commands }
}

test('导出的是 Koishi 形态', () => {
  assert.equal(name, 'ping')
  assert.equal(config.meta.type, 'object')
  assert.equal(typeof apply, 'function')
})

test('ping_now 返回时间与运行时长', async () => {
  const { tools } = boot()
  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, 'ping_now')
  const result = await tools[0].execute({})
  assert.equal(result.ok, true)
  assert.ok(Number.isFinite(result.uptimeMs))
  assert.ok(Date.parse(result.at) > 0)
})

test('/ping 路由可用', () => {
  const { routes } = boot()
  const handler = routes.get('/ping')
  assert.equal(typeof handler, 'function')
  assert.equal(handler({}).ok, true)
})

test('ping 指令回 pong', async () => {
  const { commands } = boot()
  const sent = []
  await commands.get('ping')({ session: { send: async (text) => sent.push(text) } })
  assert.deepEqual(sent, ['pong'])
})
