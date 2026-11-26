import { Schema, type Ctx } from '@aurabot/plugin-api'

const STARTED_AT = Date.now()

export const name = 'ping'

export const config = Schema.object({})

export function apply(ctx: Ctx) {
  ctx.tool({
    name: 'ping_now',
    description: '返回服务器当前时间和本插件的运行时长。不需要参数。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute() {
      const snapshot = { at: new Date().toISOString(), uptimeMs: Date.now() - STARTED_AT }
      return {
        ok: true,
        message: `服务器时间 ${snapshot.at}，已运行 ${Math.round(snapshot.uptimeMs / 1000)} 秒`,
        ...snapshot,
      }
    },
  })

  ctx.server.get('/ping', () => ({ ok: true, at: new Date().toISOString(), uptimeMs: Date.now() - STARTED_AT }))

  ctx.command('ping')
    .description('回一句 pong（用户直接触发，不经过模型）')
    .action(async ({ session }) => {
      await session.send('pong')
    })

  ctx.logger.info('[ping] 已启动')
}
