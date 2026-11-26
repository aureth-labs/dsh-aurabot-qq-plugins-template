import test from 'node:test'
import assert from 'node:assert/strict'
import { name, config, apply } from '../lib/index.js'

function boot(settings = {}) {
  const tools = []
  const routes = new Map()
  const commands = new Map()

  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    tool: (spec) => {
      tools.push(spec)
      return () => {}
    },
    server: {
      get: (path, handler) => {
        routes.set(path, handler)
        return () => {}
      },
      post: () => () => {},
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

  apply(ctx, { enabled: true, greeting: '你好', ...settings })
  return { tools, routes, commands }
}

test('导出的是 Koishi 形态', () => {
  assert.equal(name, 'hello')
  assert.equal(config.kind, 'object')
  assert.equal(typeof apply, 'function')
})

test('hello_echo 按问候语回话', async () => {
  const { tools } = boot({ greeting: '嗨' })
  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, 'hello_echo')
  assert.deepEqual(await tools[0].execute({ text: '世界' }), { ok: true, message: '嗨，世界' })
})

test('关掉总开关就不注册工具', () => {
  const { tools, commands } = boot({ enabled: false })
  assert.equal(tools.length, 0)
  assert.equal(commands.size, 0)
})

test('hello 指令直接回话，不经过模型', async () => {
  const { commands } = boot({ greeting: '嗨' })
  const handler = commands.get('hello <text:string>')
  const sent = []
  await handler({ session: { userName: '小明', send: async (text) => sent.push(text) } }, '世界')
  assert.deepEqual(sent, ['嗨，世界'])
})
