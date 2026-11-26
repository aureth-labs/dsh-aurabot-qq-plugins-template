import test from 'node:test'
import assert from 'node:assert/strict'
import { name, config, apply } from '../lib/index.js'

function boot(settings = {}) {
  const middlewares = []
  const routes = new Map()
  const listeners = new Map()
  let live = { enabled: true, rules: [], ...settings }

  const register = (method) => (path, handler) => {
    routes.set(method + ' ' + path, handler)
    return () => {}
  }

  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    middleware: (fn, options) => {
      middlewares.push({ fn, options })
      return () => {}
    },
    server: {
      get: register('GET'),
      post: register('POST'),
      put: register('PUT'),
      patch: register('PATCH'),
      delete: register('DELETE'),
    },
    http: { body: async request => request?.body || {} },
    get config() { return live },
    on: (event, handler) => {
      listeners.set(event, handler)
      return () => {}
    },
  }

  apply(ctx, { enabled: true, rules: [], ...settings })

  return {
    middlewares,
    routes,
    emitConfig(next) {
      live = { enabled: true, rules: [], ...next }
      const handler = listeners.get('config')
      if (handler) handler(live, live)
    },
  }
}

function sessionOf(content, userName = '小红') {
  const sent = []
  const session = {
    userId: '10001',
    userName,
    channelId: 'group-1',
    content,
    send: async (text) => sent.push(text),
  }
  return { session, sent }
}

const CONTAINS_RULE = { pattern: '打卡', reply: '收到，{user} 已打卡', match: 'contains', alsoToModel: false }

test('导出的是 Koishi 形态', () => {
  assert.equal(name, 'auto-reply')
  assert.equal(config.kind, 'object')
  assert.equal(typeof apply, 'function')
})

test('包含匹配命中就回话，不再往下传', async () => {
  const { middlewares } = boot({ rules: [CONTAINS_RULE] })
  const { session, sent } = sessionOf('我来打卡了')
  let passedNext = false

  await middlewares[0].fn(session, async () => { passedNext = true })

  assert.equal(passedNext, false)
  assert.deepEqual(sent, ['收到，小红 已打卡'])
})

test('没命中的消息交给下一段', async () => {
  const { middlewares } = boot({ rules: [CONTAINS_RULE] })
  const { session, sent } = sessionOf('今天天气不错')
  let passedNext = false

  await middlewares[0].fn(session, async () => { passedNext = true })

  assert.equal(passedNext, true)
  assert.deepEqual(sent, [])
})

test('正则规则按正则解释', async () => {
  const rule = { pattern: '^抽卡(\\s|$)', reply: '欧气满满', match: 'regex', alsoToModel: false }
  const { middlewares } = boot({ rules: [rule] })

  const hit = sessionOf('抽卡 10 连')
  await middlewares[0].fn(hit.session, async () => {})
  assert.deepEqual(hit.sent, ['欧气满满'])

  const miss = sessionOf('今天抽卡了吗')
  let passedNext = false
  await middlewares[0].fn(miss.session, async () => { passedNext = true })
  assert.equal(passedNext, true)
  assert.deepEqual(miss.sent, [])
})

test('正则写错不抛异常，只是不命中', async () => {
  const rule = { pattern: '(未闭合', reply: '不该出现', match: 'regex', alsoToModel: false }
  const { middlewares } = boot({ rules: [rule] })
  const { session, sent } = sessionOf('随便说点什么')
  let passedNext = false

  await middlewares[0].fn(session, async () => { passedNext = true })

  assert.equal(passedNext, true)
  assert.deepEqual(sent, [])
})

test('alsoToModel 打开时，回过还继续往下传', async () => {
  const rule = { pattern: '打卡', reply: '收到', match: 'contains', alsoToModel: true }
  const { middlewares } = boot({ rules: [rule] })
  const { session, sent } = sessionOf('打卡')
  let passedNext = false

  await middlewares[0].fn(session, async () => { passedNext = true })

  assert.equal(passedNext, true)
  assert.deepEqual(sent, ['收到'])
})

test('空 pattern 的规则被丢掉', async () => {
  const rule = { pattern: '   ', reply: '不该出现', match: 'contains', alsoToModel: false }
  const { middlewares } = boot({ rules: [rule] })
  const { session, sent } = sessionOf('   ')
  let passedNext = false

  await middlewares[0].fn(session, async () => { passedNext = true })

  assert.equal(passedNext, true)
  assert.deepEqual(sent, [])
})

test('/test 路由返回命中的规则，不改状态', async () => {
  const { routes } = boot({ rules: [CONTAINS_RULE] })
  const handler = routes.get('POST /test')

  const hit = await handler({ method: 'POST', body: { text: '打卡一下' } })
  assert.equal(hit.ok, true)
  assert.equal(hit.matched.pattern, '打卡')

  const miss = await handler({ method: 'POST', body: { text: '没事' } })
  assert.equal(miss.ok, true)
  assert.equal(miss.matched, null)

  const empty = await handler({ method: 'POST', body: {} })
  assert.equal(empty.ok, false)
})

test('/rules 路由列出规则与编译错误', async () => {
  const rules = [
    CONTAINS_RULE,
    { pattern: '(未闭合', reply: 'x', match: 'regex', alsoToModel: false },
  ]
  const { routes } = boot({ rules })
  const result = routes.get('GET /rules')()

  assert.equal(result.ok, true)
  assert.equal(result.rules.length, 2)
  assert.equal(result.rules[0].error, null)
  assert.ok(result.rules[1].error)
})

test('关掉总开关：中间件照常注册，但一条都不回', async () => {
  const { middlewares, routes } = boot({ enabled: false, rules: [CONTAINS_RULE] })

  // 留着注册是有意的：面板还能读规则，开关也能热切回来
  assert.equal(middlewares.length, 1)
  assert.ok(routes.has('GET /rules'))

  const { session, sent } = sessionOf('我来打卡了')
  let passedNext = false
  await middlewares[0].fn(session, async () => { passedNext = true })

  assert.equal(passedNext, true)
  assert.deepEqual(sent, [])
})

test('配置变更后不重载插件，新规则立即生效', async () => {
  const { middlewares, emitConfig } = boot({ rules: [] })

  const before = sessionOf('我来打卡了')
  let passedBefore = false
  await middlewares[0].fn(before.session, async () => { passedBefore = true })
  assert.equal(passedBefore, true)
  assert.deepEqual(before.sent, [])

  emitConfig({ rules: [CONTAINS_RULE] })

  const after = sessionOf('我来打卡了')
  await middlewares[0].fn(after.session, async () => {})
  assert.deepEqual(after.sent, ['收到，小红 已打卡'])
})
