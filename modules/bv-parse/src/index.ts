import { Schema, type Ctx } from '@aurabot/plugin-api'

// 消息里出现 BV 号就直接回一个可点的链接，不经过模型。
// 这是「中间件插件」的最小样子：先注册中间件分词，再挂一个同名指令给用户主动查。

export const name = 'bv-parse'

export interface Config {
  enabled: boolean
  template: string
}

export const config = Schema.object({
  enabled: Schema.boolean().default(true).description('关掉后中间件和指令都不注册'),
  template: Schema.string()
    .default('这条是 B 站视频：https://www.bilibili.com/video/{bv}')
    .description('回话模板，{bv} 会换成视频号'),
})

const BV_RE = /\b(BV[0-9A-Za-z]{10})\b/

export function apply(ctx: Ctx, config: Config) {
  if (!config.enabled) {
    ctx.logger.info('[bv-parse] 已关闭，跳过注册')
    return
  }

  const reply = (bv: string) => String(config.template || '{bv}').replace(/\{bv\}/g, bv)

  // 中间件：命中就自己回一条并结束（不调 next()，这条不再进模型）
  ctx.middleware(async (session, next) => {
    const hit = BV_RE.exec(String(session.content || ''))
    if (!hit) return next()
    await session.send(reply(hit[1]))
  }, { name: 'bv-parse', before: 'llm' })

  ctx.command('bv <id:string>')
    .description('把 BV 号拼成可点的链接（用户直接触发，不经过模型）')
    .action(async ({ session }, id) => {
      const bv = String(id || '').trim()
      if (!BV_RE.test(bv)) {
        await session.send('这不像 BV 号：要 BV 开头加 10 位字母数字')
        return
      }
      await session.send(reply(bv))
    })

  ctx.logger.info('[bv-parse] 已启动')
}
