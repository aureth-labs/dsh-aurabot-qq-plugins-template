import test from 'node:test'
import assert from 'node:assert/strict'
import { name, config, apply } from '../lib/index.js'

const TEMPLATE = '视频：https://www.bilibili.com/video/{bv}'

function boot(settings = {}) {
  const middlewares = []
  const commands = new Map()

  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    middleware: (fn, options) => {
      middlewares.push({ fn, options })
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

  apply(ctx, { enabled: true, template: TEMPLATE, ...settings })
  return { middlewares, commands }
}

function fakeSession(content) {
  const sent = []
  const session = {
    content,
    userName: '小明',
    send: async (text) => sent.push(text),
  }
  return { session, sent }
}

test('导出的是 Koishi 形态', () => {
  assert.equal(name, 'bv-parse')
  assert.equal(config.kind, 'object')
  assert.equal(typeof apply, 'function')
})

test('中间件命中 BV 号就回链接，不再往下传', async () => {
  const { middlewares } = boot()
  const { session, sent } = fakeSession('看这个 BV1xx411c7mD 笑死')
  let passedNext = false

  await middlewares[0].fn(session, async () => { passedNext = true })

  assert.equal(passedNext, false)
  assert.deepEqual(sent, ['视频：https://www.bilibili.com/video/BV1xx411c7mD'])
})

test('没有 BV 号就调 next() 交给下一段', async () => {
  const { middlewares } = boot()
  const { session, sent } = fakeSession('今天天气不错')
  let passedNext = false

  await middlewares[0].fn(session, async () => { passedNext = true })

  assert.equal(passedNext, true)
  assert.deepEqual(sent, [])
})

test('bv 指令自己校验格式', async () => {
  const { commands } = boot()
  const handler = commands.get('bv <id:string>')

  const bad = fakeSession('')
  await handler({ session: bad.session }, '这不是BV号')
  assert.deepEqual(bad.sent, ['这不像 BV 号：要 BV 开头加 10 位字母数字'])

  const good = fakeSession('')
  await handler({ session: good.session }, 'BV1xx411c7mD')
  assert.deepEqual(good.sent, ['视频：https://www.bilibili.com/video/BV1xx411c7mD'])
})

test('关掉总开关什么都不注册', () => {
  const { middlewares, commands } = boot({ enabled: false })
  assert.equal(middlewares.length, 0)
  assert.equal(commands.size, 0)
})
