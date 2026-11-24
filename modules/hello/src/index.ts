interface Api {
  log: { info(...args: any[]): void; warn(...args: any[]): void }
  settings(): Record<string, any>
  defineTool(spec: any): any
  tool(builder: any): () => void
  route(path: string, handler: (req: any) => any): () => void
}

interface Settings {
  enabled: boolean
  greeting: string
}

const DEFAULTS: Settings = { enabled: true, greeting: '你好' }

export default {
  id: 'shangxueink/hello',
  name: '示例：打招呼',
  version: '1.0.0',
  api: 1,
  description: '模板示例：注册一个 hello_echo 工具，把模型给的文字原样回给它',
  panel: './client/panel.js',
  defaults: { ...DEFAULTS },
  settings: [
    {
      key: 'enabled',
      label: '总开关',
      type: 'switch',
      hint: '关掉后就不再向模型提供 hello_echo 工具',
    },
    {
      key: 'greeting',
      label: '问候语',
      type: 'text',
      hint: '回话时放在最前面的那句话',
    },
  ],

  setup(api: Api) {
    const read = (): Settings => ({ ...DEFAULTS, ...(api.settings() || {}) })

    api.tool(({ chat }: any) => {
      if (!chat || chat.kind === 'system') return []
      if (!read().enabled) return []
      return api.defineTool({
        name: 'hello_echo',
        description: '把给定的一句话加上问候语回给模型。用于验证插件装好了、工具能注册上。',
        properties: {
          text: { type: 'string', description: '要回显的文字' },
        },
        required: ['text'],
        execute: async (args: any) => {
          const text = String((args && args.text) || '').trim()
          if (!text) return { ok: false, message: 'text 是空的' }
          const greeting = read().greeting || DEFAULTS.greeting
          return { ok: true, message: `${greeting}，${text}` }
        },
      })
    })

    api.route('/info', () => ({ ok: true, greeting: read().greeting, enabled: read().enabled }))

    api.log.info('[hello] 示例插件已启动')
    return {}
  },
}
