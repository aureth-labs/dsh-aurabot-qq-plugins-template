import test from 'node:test'
import assert from 'node:assert/strict'
import plugin from '../lib/index.js'

function boot() {
  const tools = []
  const routes = new Map()
  const api = {
    log: { info() {}, warn() {} },
    defineTool: (spec) => spec,
    tool: (builder) => {
      const made = builder({ chat: { kind: 'private', chatId: 'p1' } })
      for (const one of Array.isArray(made) ? made : [made]) if (one) tools.push(one)
      return () => {}
    },
    route: (path, handler) => {
      routes.set(path, handler)
      return () => {}
    },
  }
  plugin.setup(api)
  return { tools, routes }
}

test('导出形状符合清单', () => {
  assert.equal(plugin.api, 1)
  assert.equal(plugin.panel, './client/panel.js')
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
