const STARTED_AT = Date.now()

interface Api {
  log: { info(...args: any[]): void; warn(...args: any[]): void }
  defineTool(spec: any): any
  tool(builder: any): () => void
  route(path: string, handler: (req: any) => any): () => void
}

function snapshot(): { at: string; uptimeMs: number } {
  return { at: new Date().toISOString(), uptimeMs: Date.now() - STARTED_AT }
}

export default {
  id: 'shangxueink/ping',
  name: '示例：探活',
  version: '1.0.0',
  api: 1,
  description: '模板示例：注册 ping_now 工具和 /ping 路由，返回当前时间与模块运行时长',
  panel: './dist/panel.js',
  defaults: {},
  settings: [],

  setup(api: Api) {
    api.tool(({ chat }: any) => {
      if (!chat || chat.kind === 'system') return []
      return api.defineTool({
        name: 'ping_now',
        description: '返回服务器当前时间和本插件的运行时长。不需要参数。',
        properties: {},
        required: [],
        execute: async () => {
          const s = snapshot()
          return { ok: true, message: `服务器时间 ${s.at}，已运行 ${Math.round(s.uptimeMs / 1000)} 秒`, ...s }
        },
      })
    })

    api.route('/ping', () => ({ ok: true, ...snapshot() }))

    api.log.info('[ping] 示例插件已启动')
    return {}
  },
}
