/**
 * 最小插件接口实现。
 *
 * 正式写法是 `import { Schema } from '@aurabot/plugin-api'`。
 * 那个包还没发布，模板里先带一份等价的最小实现，保证示例能编译、能跑。
 * 发布后删掉本文件，把 index.ts 的 import 换掉即可。
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

export interface Command {
  description(text: string): Command
  action(handler: (args: { session: Session }, ...params: string[]) => unknown): Command
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
  route(path: string, handler: (request: unknown) => unknown): () => void
}
