import test from 'node:test'
import assert from 'node:assert/strict'
import plugin from '../lib/index.js'

function boot(settings) {
  const tools = []
  const routes = new Map()
  const api = {
    log: { info() {}, warn() {} },
    settings: () => settings,
    defineTool: (spec) => spec,
    tool: (builder) => {
      const made = builder({ chat: { kind: 'group', chatId: 'g1' } })
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
  assert.equal(typeof plugin.setup, 'function')
})

test('hello_echo 按问候语回话', async () => {
  const { tools } = boot({ enabled: true, greeting: '嗨' })
  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, 'hello_echo')
  const result = await tools[0].execute({ text: '世界' })
  assert.deepEqual(result, { ok: true, message: '嗨，世界' })
})

test('关掉总开关就不注册工具', () => {
  const { tools } = boot({ enabled: false })
  assert.equal(tools.length, 0)
})
