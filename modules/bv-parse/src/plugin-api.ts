/**
 * 这不是插件，是插件接口的本地替身。
 *
 * 正式写法是 `import { Schema } from '@aurabot/plugin-api'`。那个包还没发布，
 * 模板先带一份等价的最小实现（Schema 构造器 + Ctx 类型），保证示例能编译、能跑。
 * 发布后删掉本文件，把 index.ts 的 import 换成正式包即可。
 */

export type SchemaType = 'boolean' | 'string' | 'number' | 'array' | 'union' | 'object'

export interface SchemaMeta {
  type: SchemaType
  default?: unknown
  description?: string
  required?: boolean
  min?: number
  max?: number
  items?: Schema
  options?: readonly unknown[]
  dict?: Record<string, Schema>
  flags: string[]
}

export class Schema {
  readonly meta: SchemaMeta

  constructor(meta: SchemaMeta) {
    this.meta = meta
  }

  default(value: unknown): this {
    this.meta.default = value
    return this
  }

  description(text: string): this {
    this.meta.description = text
    return this
  }

  min(value: number): this {
    this.meta.min = value
    return this
  }

  max(value: number): this {
    this.meta.max = value
    return this
  }

  required(): this {
    this.meta.required = true
    return this
  }

  experimental(): this {
    this.meta.flags.push('experimental')
    return this
  }

  disabled(): this {
    this.meta.flags.push('disabled')
    return this
  }

  hidden(): this {
    this.meta.flags.push('hidden')
    return this
  }

  deprecated(): this {
    this.meta.flags.push('deprecated')
    return this
  }

  static boolean(): Schema {
    return new Schema({ type: 'boolean', flags: [] })
  }

  static string(): Schema {
    return new Schema({ type: 'string', flags: [] })
  }

  static number(): Schema {
    return new Schema({ type: 'number', flags: [] })
  }

  static natural(): Schema {
    return new Schema({ type: 'number', min: 0, flags: [] })
  }

  static array(items: Schema): Schema {
    return new Schema({ type: 'array', items, flags: [] })
  }

  static union(options: readonly unknown[]): Schema {
    return new Schema({ type: 'union', options, flags: [] })
  }

  static object(dict: Record<string, Schema>): Schema {
    return new Schema({ type: 'object', dict, flags: [] })
  }
}

export interface Session {
  userId: string
  userName?: string
  channelId: string
  content: string
  send(...content: unknown[]): Promise<unknown>
}

/** 中间件里调用 next() = 交给下一段；不调 = 这条我处理完了。 */
export type Next = () => Promise<unknown>
export type Middleware = (session: Session, next: Next) => unknown

export interface Command {
  description(text: string): Command
  action(handler: (args: { session: Session }, ...params: string[]) => unknown): Command
}

export type ServerHandler = (request: unknown) => unknown

/** 和 Koishi 的 `ctx.server` 一样：一个 HTTP 路由实例，按动词注册。 */
export interface Server {
  get(path: string, handler: ServerHandler): () => void
  post(path: string, handler: ServerHandler): () => void
  put(path: string, handler: ServerHandler): () => void
  patch(path: string, handler: ServerHandler): () => void
  delete(path: string, handler: ServerHandler): () => void
  head(path: string, handler: ServerHandler): () => void
  options(path: string, handler: ServerHandler): () => void
  all(path: string, handler: ServerHandler): () => void
}

export interface ToolSpec {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute(args: Record<string, unknown>): unknown
}

export interface Ctx {
  logger: {
    info(message: string): void
    warn(message: string): void
    error(message: string): void
  }
  command(name: string): Command
  tool(spec: ToolSpec): () => void
  server: Server
  /** 入站中间件：默认挂在 middleware 段，抢在模型前面。 */
  middleware(fn: Middleware, options?: { name?: string; before?: string; after?: string }): () => void
}
