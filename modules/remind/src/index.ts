import { Schema, h, type Ctx, type Target } from '@aurabot/plugin-api'

export const name = 'remind'

export interface Config {
  enabled: boolean
  maxMinutes: number
  everyReminderSuffix: string
}

export const config = Schema.object({
  enabled: Schema.boolean().default(true).description('总开关；关掉后工具和指令都不注册'),
  maxMinutes: Schema.natural().min(1).max(1440).default(120).description('一次最多能定多少分钟'),
  everyReminderSuffix: Schema.string().default('⏰ 提醒：').description('提醒消息的开头'),
})

interface ReminderPlan {
  minutes: number
  text: string
}

/** 把「几分钟 + 提醒什么」校验成一份计划；不合法就返回原因，别抛异常。 */
function plan(args: { minutes?: unknown; text?: unknown }, maxMinutes: number): ReminderPlan | string {
  const minutes = Number(args.minutes)
  const text = String(args.text ?? '').trim()

  if (!Number.isFinite(minutes) || minutes <= 0) return '分钟数要是大于 0 的数字'
  if (minutes > maxMinutes) return '最多只能定 ' + maxMinutes + ' 分钟，太久了记不住'
  if (!text) return '要提醒什么？给我一句话'

  return { minutes: Math.round(minutes * 10) / 10, text }
}

export function apply(ctx: Ctx, config: Config) {
  if (!config.enabled) return
  const maxMinutes = Number(config.maxMinutes) || 120
  const prefix = String(config.everyReminderSuffix ?? '⏰ 提醒：')

  function schedule(plan: ReminderPlan, target: Target) {
    // ctx.setTimeout 的定时器随模块卸载自动清掉，不用自己记句柄
    ctx.setTimeout(Math.round(plan.minutes * 60_000), async () => {
      const bot = ctx.bots.get(target.botId, target.platform)
      if (bot?.status !== 'online') {
        ctx.logger.warn('到点了，但没有在线的机器人，这条提醒没发出去')
        return
      }
      try {
        await bot.sendPrivateMessage(target.id, h.text(prefix + plan.text))
      } catch (error) {
        ctx.logger.warn('提醒发送失败：' + (error instanceof Error ? error.message : String(error)))
      }
    })
  }

  // 给模型用的工具：用户说「十分钟后提醒我喝水」，模型自己调它并传参
  ctx.tool(({ target }) => {
    if (target?.type !== 'private' || !ctx.isOwner(target.id, target.platform, target.botId)) return null
    return ctx.defineTool({
      name: 'remind',
      description: '在指定分钟数后私聊提醒主人一件事。用户说「过 X 分钟提醒我…」时用它。',
      properties: {
          minutes: { type: 'number', description: '多少分钟后提醒，最多 ' + maxMinutes + ' 分钟' },
          text: { type: 'string', description: '要提醒的内容，一句话' },
        },
      required: ['minutes', 'text'],
      execute: async (args) => {
        if (!ctx.isOwner(target.id, target.platform, target.botId)) return { ok: false, message: '主人授权已更改' }
        const planned = plan({ minutes: args.minutes, text: args.text }, maxMinutes)
        if (typeof planned === 'string') return { ok: false, message: planned }

        schedule(planned, target)
        return { ok: true, message: '好，' + planned.minutes + ' 分钟后提醒你：' + planned.text }
      },
    })
  })

  // 给用户用的指令：不经过模型，/remind 10 喝水
  ctx.command('remind <minutes:number> <text:text>')
    .description('定一个提醒（分钟 + 内容），到点私聊你')
    .usage('remind 10 喝水')
    .action(async ({ session }, minutes, text) => {
      const planned = plan({ minutes, text }, maxMinutes)
      if (typeof planned === 'string') {
        await session.send(planned)
        return
      }

      schedule(planned, { platform: session.platform, botId: session.bot.id, type: 'private', id: session.userId })
      await session.send('好，' + planned.minutes + ' 分钟后提醒你：' + planned.text)
    })

  ctx.logger.info('[remind] 已启动，上限 ' + maxMinutes + ' 分钟')
}
