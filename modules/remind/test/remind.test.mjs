import test from 'node:test'
import assert from 'node:assert/strict'
import { name, config, apply } from '../lib/index.js'

function boot(settings = {}) {
  const tools = []
  const commands = new Map()
  const timers = []
  const sentPrivate = []

  const bot = {
    id: 'onebot',
    platform: 'qq',
    selfId: '20000002',
    status: 'online',
    sendMessage: async () => {},
    sendPrivateMessage: async (userId, content) => sentPrivate.push([userId, content]),
  }

  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    tool: (spec) => {
      tools.push(spec({ target: { platform: 'qq', botId: 'onebot', type: 'private', id: '10000001' } }))
      return () => {}
    },
    command: (commandName) => {
      const command = {
        description: () => command,
        usage: () => command,
        alias: () => command,
        action: (handler) => {
          commands.set(commandName, handler)
          return command
        },
      }
      return command
    },
    setTimeout: (ms, fn) => {
      timers.push({ ms, fn })
      return () => {}
    },
    bots: { get: (id, platform) => id === bot.id && platform === bot.platform ? bot : undefined },
    isOwner: id => id === '10000001',
    defineTool: spec => ({ ...spec, parameters: { properties: spec.properties, required: spec.required } }),
  }

  apply(ctx, { enabled: true, maxMinutes: 120, everyReminderSuffix: '⏰ 提醒：', ...settings })
  return { tools, commands, timers, sentPrivate }
}

function sessionOf(userName = '小明') {
  const sent = []
  const session = {
    platform: 'qq', bot: { id: 'onebot' }, userId: '10001',
    userName,
    channelId: 'group-1',
    content: '',
    send: async (text) => sent.push(text),
    sendPrivateMessage: async () => {},
  }
  return { session, sent }
}

test('导出的是 Koishi 形态', () => {
  assert.equal(name, 'remind')
  assert.equal(config.kind, 'object')
  assert.equal(typeof apply, 'function')
})

test('tool 的入参 schema 声明齐全', () => {
  const { tools } = boot()
  assert.equal(tools.length, 1)

  const spec = tools[0]
  assert.equal(spec.name, 'remind')
  assert.deepEqual(spec.parameters.required, ['minutes', 'text'])
  assert.equal(spec.parameters.properties.minutes.type, 'number')
  assert.equal(spec.parameters.properties.text.type, 'string')
})

test('模型调工具：到点私聊主人', async () => {
  const { tools, timers, sentPrivate } = boot()

  const result = await tools[0].execute({ minutes: 10, text: '喝水' })
  assert.equal(result.ok, true)
  assert.equal(timers.length, 1)
  assert.equal(timers[0].ms, 600_000)

  await timers[0].fn()
  assert.deepEqual(sentPrivate, [['10000001', { type: 'text', attrs: { content: '⏰ 提醒：喝水' } }]])
})

test('工具参数不合法时不排定时器', async () => {
  const { tools, timers } = boot({ maxMinutes: 30 })

  const tooLong = await tools[0].execute({ minutes: 90, text: '躺一会' })
  assert.equal(tooLong.ok, false)
  assert.ok(tooLong.message.includes('30'))

  const noText = await tools[0].execute({ minutes: 5, text: '   ' })
  assert.equal(noText.ok, false)

  const zero = await tools[0].execute({ minutes: 0, text: '无效' })
  assert.equal(zero.ok, false)

  assert.equal(timers.length, 0)
})

test('用户发指令：不经过模型，直接回话并排定时器', async () => {
  const { commands, timers } = boot()
  const handler = commands.get('remind <minutes:number> <text:text>')

  const { session, sent } = sessionOf()
  await handler({ session }, 1, '倒水')
  assert.deepEqual(sent, ['好，1 分钟后提醒你：倒水'])
  assert.equal(timers.length, 1)
  assert.equal(timers[0].ms, 60_000)
})

test('指令参数不合法时只回原因，不排定时器', async () => {
  const { commands, timers } = boot()
  const handler = commands.get('remind <minutes:number> <text:text>')

  const { session, sent } = sessionOf()
  await handler({ session }, 'abc', '倒水')
  assert.equal(sent.length, 1)
  assert.ok(sent[0].includes('分钟数'))
  assert.equal(timers.length, 0)
})

test('缺少来源会话时不向模型提供提醒工具', async () => {
  const tools = []
  const timers = []

  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    tool: (spec) => {
      tools.push(spec)
      return () => {}
    },
    command: () => {
      const command = {
        description: () => command,
        usage: () => command,
        alias: () => command,
        action: () => command,
      }
      return command
    },
    setTimeout: (ms, fn) => {
      timers.push({ ms, fn })
      return () => {}
    },
    bots: [],
    config: () => ({}),
  }

  apply(ctx, { enabled: true, maxMinutes: 120, everyReminderSuffix: '⏰ 提醒：' })

  assert.equal(tools[0]({}), null)
  assert.equal(timers.length, 0)
})
