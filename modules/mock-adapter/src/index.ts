import {
  Schema,
  type AdapterRuntime,
  type AdapterSpec,
  Bot,
  type Capability,
  type Ctx,
} from '@aurabot/plugin-api'

export const name = 'mock-adapter'

export const config = Schema.object({
  platform: Schema.string().default('mock').description('这个演示平台在框架里的平台名'),
})

interface OutboxItem {
  method: 'sendMessage' | 'sendPrivateMessage'
  target: string
  content: unknown
  at: string
}

/**
 * 一个不连任何网络的适配器，用来演示「适配器就是普通插件」。
 *
 * 它做了三件真正适配器都会做的事：
 *   1. `ctx.adapter(spec)` 注册实例（卸载时宿主自动断开）
 *   2. 把平台消息用 `runtime.emitMessage()` 投进管线
 *   3. 实现 Bot 的发送方法（这里写进内存 outbox，方便用 HTTP 看）
 */
export async function apply(ctx: Ctx, cfg: { platform?: string }) {
  const platform = String(cfg?.platform || 'mock')
  const outbox: OutboxItem[] = []
  let runtime: AdapterRuntime | null = null

  const spec: AdapterSpec = {
    platform,
    name: '演示平台（不联网）',
    capabilities: ['text'],

    async connect(_config, rt) {
      runtime = rt
      const bot = new class extends Bot {
        readonly id = ctx.instanceId
        readonly platform = platform
        readonly selfId = 'demo-bot'
        readonly status = 'online' as const
        supports(capability: Capability) { return capability === 'text' }
        async sendMessage(channelId: string, content: unknown) {
          outbox.push({ method: 'sendMessage', target: channelId, content, at: new Date().toISOString() })
          return { ok: true, id: String(outbox.length) }
        }
        async sendPrivateMessage(userId: string, content: unknown) {
          outbox.push({ method: 'sendPrivateMessage', target: userId, content, at: new Date().toISOString() })
          return { ok: true, id: String(outbox.length) }
        }
      }()
      rt.log(`演示适配器上线：${platform}/${bot.selfId}`)
      return bot
    },

    async disconnect() {
      runtime = null
    },
  }

  await ctx.adapter(spec)

  // 模拟「平台来了一条消息」：投进管线，指令 / 中间件 / 模型照常跑。
  ctx.server.post('/inject', async (request) => {
    if (!runtime) return { ok: false, message: '适配器还没上线' }
    const body = await ctx.http.body(request)
    const text = String(body.text || '')
    if (!text.trim()) return { ok: false, message: 'text 不能为空' }
    runtime.emitMessage({
      type: body.type === 'private' ? 'private' : 'group',
      channelId: String(body.channelId || 'demo-channel'),
      userId: String(body.userId || 'demo-user'),
      userName: String(body.userName || '演示用户'),
      content: text,
    })
    return { ok: true, message: '消息已投给管线' }
  })

  ctx.server.get('/outbox', () => ({ ok: true, platform, items: outbox.slice(-50) }))

  // 插件自己也能正常注册指令：不管消息从哪个平台来，都能命中。
  ctx.command('whoami').action(async ({ session }) => {
    await session.send(`平台 ${session.platform}｜会话 ${session.channelId}｜用户 ${session.userId}`)
  })

  ctx.logger.info('[mock-adapter] 已启动，POST /inject 可以模拟平台消息')
}
