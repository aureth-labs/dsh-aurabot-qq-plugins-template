import { Schema, type Ctx, type Session } from './plugin-api.js'

export const name = 'auto-reply'

export interface Rule {
  pattern: string
  reply: string
  match: 'contains' | 'regex'
  alsoToModel: boolean
}

export interface Config {
  enabled: boolean
  rules: Rule[]
}

export const config = Schema.object({
  enabled: Schema.boolean().default(true).description('总开关；关掉后中间件照常注册，但什么都不回'),
  rules: Schema.array(
    Schema.object({
      pattern: Schema.string().required().description('要匹配的内容；match=regex 时按正则解释'),
      reply: Schema.string().required().description('回什么，{user} 换成发言人的昵称'),
      match: Schema.union(['contains', 'regex']).default('contains').description('匹配方式'),
      alsoToModel: Schema.boolean().default(false).description('回过之后还让模型看一眼'),
    }),
  ).default([]).description('规则表；从上往下第一条命中的生效'),
})

/** 一条编译好的规则。正则写错时不抛异常，只标成 error 并永远不命中，面板能看到原因。 */
interface CompiledRule {
  pattern: string
  reply: string
  match: 'contains' | 'regex'
  alsoToModel: boolean
  error: string
  test(text: string): boolean
  render(session: Session): string
}

interface RuleState {
  enabled: boolean
  rules: CompiledRule[]
  broken: CompiledRule[]
}

function compileRule(rule: Rule): CompiledRule | null {
  const pattern = String(rule?.pattern || '').trim()
  if (!pattern) return null

  const reply = String(rule?.reply || '')
  const match: 'contains' | 'regex' = rule?.match === 'regex' ? 'regex' : 'contains'

  let test = (text: string): boolean => text.includes(pattern)
  let error = ''

  if (match === 'regex') {
    try {
      const re = new RegExp(pattern)
      test = (text: string): boolean => re.test(text)
    } catch (failure) {
      error = failure instanceof Error ? failure.message : String(failure)
      test = (): boolean => false
    }
  }

  return {
    pattern,
    reply,
    match,
    alsoToModel: rule?.alsoToModel === true,
    error,
    test,
    render: (session: Session): string => reply.replace(/\{user\}/g, session.userName || '有人'),
  }
}

function compileAll(input: Config): RuleState {
  const rules: CompiledRule[] = []
  for (const rule of input.rules || []) {
    const compiled = compileRule(rule)
    if (compiled) rules.push(compiled)
  }
  return {
    enabled: input.enabled !== false,
    rules,
    broken: rules.filter((rule) => rule.error),
  }
}

/**
 * apply 拿到的 config 是启动那一刻的快照；面板保存设置后宿主只发 `config` 事件，不会重载插件。
 * 所以每次要用都向宿主问一次最新值，别把快照存起来。
 */
function settingsOf(ctx: Ctx, fallback: Config): Config {
  const read = ctx.settings?.()
  if (!read || typeof read !== 'object') return fallback
  return {
    enabled: read.enabled !== false,
    rules: Array.isArray(read.rules) ? (read.rules as Rule[]) : [],
  }
}

function reportBroken(ctx: Ctx, state: RuleState) {
  if (!state.broken.length) return
  const patterns = state.broken.map((rule) => rule.pattern).join(' | ')
  ctx.logger.warn('[auto-reply] 有 ' + state.broken.length + ' 条正则写错，已跳过：' + patterns)
}

export function apply(ctx: Ctx, config: Config) {
  let state = compileAll(settingsOf(ctx, config))
  reportBroken(ctx, state)

  // 配置一变就重编译：不重载插件、不断线，规则立即生效。
  ctx.on?.('config', () => {
    state = compileAll(settingsOf(ctx, config))
    reportBroken(ctx, state)
    ctx.logger.info('[auto-reply] 配置变了，现在 ' + state.rules.length + ' 条规则')
  })

  const match = (text: string): CompiledRule | undefined => state.rules.find((rule) => rule.test(text))

  ctx.middleware(async (session, next) => {
    if (!state.enabled) return next()

    const text = String(session.content || '').trim()
    if (!text) return next()

    const hit = match(text)
    if (!hit) return next()

    await session.send(hit.render(session))
    // 默认回过就结束，这条不再进模型；规则自己要求才继续往下传。
    if (!hit.alsoToModel) return
    return next()
  }, { name: 'auto-reply', before: 'llm' })

  // 面板读规则表（带编译错误），不把整份宿主配置吐出去
  ctx.server.get('/rules', () => ({
    ok: true,
    enabled: state.enabled,
    rules: state.rules.map((rule) => ({
      pattern: rule.pattern,
      reply: rule.reply,
      match: rule.match,
      alsoToModel: rule.alsoToModel,
      error: rule.error || null,
    })),
  }))

  // 面板试匹配：给一段话，看会被哪条接住；不改任何状态
  ctx.server.post('/test', async (request) => {
    const body = await readJsonBody(ctx, request)
    const text = String(body.text || '')
    if (!text) return { ok: false, message: '给我一段话再试' }

    const hit = match(text)
    if (!hit) return { ok: true, matched: null }

    return {
      ok: true,
      matched: {
        pattern: hit.pattern,
        reply: hit.render({ userName: '小明' } as Session),
      },
    }
  })

  ctx.logger.info('[auto-reply] 已启动，' + state.rules.length + ' 条规则')
}

/** POST body 统一从宿主的 http.body 拿：它已经解好 JSON，也带大小限制。 */
async function readJsonBody(ctx: Ctx, request: unknown): Promise<Record<string, any>> {
  const direct = (request as { body?: unknown })?.body
  if (direct && typeof direct === 'object') return direct as Record<string, any>

  const reader = ctx.core?.http?.body
  if (typeof reader !== 'function') return {}

  try {
    const parsed = await reader(request)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
