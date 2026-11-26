import { Schema, type Ctx } from '@aurabot/plugin-api'

export const name = 'hello'

export interface Config {
  enabled: boolean
  greeting: string
}

export const config = Schema.object({
  enabled: Schema.boolean().default(true).description('总开关：关掉后不再注册 hello_echo'),
  greeting: Schema.string().default('你好').description('回话时放在最前面的那句话'),
})

export function apply(ctx: Ctx, config: Config) {
  if (!config.enabled) {
    ctx.logger.info('[hello] 已关闭，跳过注册')
    return
  }

  ctx.command('hello <text:string>')
    .description('让机器人打个招呼（用户直接触发，不经过模型）')
    .action(async ({ session }, text) => {
      await session.send(`${config.greeting}，${text || session.userName || '陌生人'}`)
    })

  ctx.tool({
    name: 'hello_echo',
    description: '把给定的一句话加上问候语回给模型。用于验证插件装好了、工具能注册上。',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '要回显的文字' },
      },
      required: ['text'],
    },
    execute(args) {
      const text = String(args.text ?? '').trim()
      if (!text) return { ok: false, message: 'text 是空的' }
      return { ok: true, message: `${config.greeting}，${text}` }
    },
  })

  ctx.server.get('/info', () => ({ ok: true, greeting: config.greeting, enabled: config.enabled }))

  ctx.logger.info('[hello] 已启动')
}
