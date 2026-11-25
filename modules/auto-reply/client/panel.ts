declare const React: any
declare const h: any
declare const ui: any
declare const call: (path: string, body?: any) => Promise<any>

interface Rule {
  pattern: string
  reply: string
  match: 'contains' | 'regex'
  alsoToModel: boolean
}

interface PanelProps {
  settings: { enabled?: boolean; rules?: Rule[] }
  draftSettings?: { enabled?: boolean; rules?: Rule[] }
  save(patch: Record<string, unknown>): Promise<unknown>
  toast(message: string, kind?: string): void
}

interface MatchOption {
  value: string
  label: string
}

const MATCH_OPTIONS: MatchOption[] = [
  { value: 'contains', label: '包含' },
  { value: 'regex', label: '正则' },
]

function normalizeRules(rules: Rule[] | undefined): Rule[] {
  return (rules || []).map(function (rule) {
    return {
      pattern: String((rule && rule.pattern) || ''),
      reply: String((rule && rule.reply) || ''),
      match: rule && rule.match === 'regex' ? 'regex' : 'contains',
      alsoToModel: Boolean(rule && rule.alsoToModel),
    } as Rule
  })
}

export default function AutoReplyPanel(props: PanelProps) {
  var toast = props.toast
  var initial = props.draftSettings || props.settings || {}

  var rulesState: [Rule[], (next: Rule[]) => void] = React.useState(function () {
    return normalizeRules(initial.rules)
  })
  var rules = rulesState[0]
  var setRules = rulesState[1]

  var probeState: [string, (next: string) => void] = React.useState('')
  var probe = probeState[0]
  var setProbe = probeState[1]

  var errorsState: [Record<string, string>, (next: Record<string, string>) => void] = React.useState({})
  var errors = errorsState[0]
  var setErrors = errorsState[1]

  function refreshErrors() {
    call('/rules')
      .then(function (result) {
        var map: Record<string, string> = {}
        var list: Array<{ pattern?: string; error?: string | null }> = (result && result.rules) || []
        for (var i = 0; i < list.length; i += 1) {
          var item = list[i]
          if (item && item.error && item.pattern) map[item.pattern] = String(item.error)
        }
        setErrors(map)
      })
      .catch(function () {
        setErrors({})
      })
  }

  React.useEffect(function () {
    refreshErrors()
  }, [])

  function patchRule(index: number, patch: Partial<Rule>) {
    var next = rules.map(function (rule, at) {
      if (at !== index) return rule
      return Object.assign({}, rule, patch)
    })
    setRules(next)
  }

  function addRule() {
    setRules(rules.concat([{ pattern: '', reply: '', match: 'contains', alsoToModel: false }]))
  }

  function removeRule(index: number) {
    setRules(rules.filter(function (_rule, at) { return at !== index }))
  }

  function saveRules() {
    Promise.resolve(props.save({ rules: rules }))
      .then(function () {
        toast('已保存 ' + rules.length + ' 条规则')
        refreshErrors()
      })
      .catch(function (failure: Error) { toast(failure.message, 'err') })
  }

  function runProbe() {
    call('/test', { text: probe })
      .then(function (result) {
        if (result && result.matched) {
          toast('命中「' + result.matched.pattern + '」→ ' + result.matched.reply)
          return
        }
        toast('没有规则命中')
      })
      .catch(function (failure: Error) { toast(failure.message, 'err') })
  }

  var rows = rules.length
    ? rules.map(function (rule, index) {
      var problem = errors[rule.pattern]
      return h(ui.Row, { key: String(index), label: '规则 ' + (index + 1), hint: problem ? '正则有问题：' + problem : '' },
        h('div', { className: 'ab-flex', style: { gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
          h('input', {
            className: 'ab-input',
            placeholder: '匹配内容',
            style: { minWidth: 160 },
            value: rule.pattern,
            onChange: function (event: { target: { value: string } }) {
              patchRule(index, { pattern: event.target.value })
            },
          }),
          h('input', {
            className: 'ab-input',
            placeholder: '回什么（{user} 换成昵称）',
            style: { minWidth: 200 },
            value: rule.reply,
            onChange: function (event: { target: { value: string } }) {
              patchRule(index, { reply: event.target.value })
            },
          }),
          h(ui.Select, {
            value: rule.match,
            options: MATCH_OPTIONS,
            width: 90,
            onChange: function (value: string) {
              patchRule(index, { match: value === 'regex' ? 'regex' : 'contains' })
            },
          }),
          h(ui.Btn, { small: true, onClick: function () { removeRule(index) } }, '删除')))
    })
    : [h(ui.Empty, { key: 'empty', icon: '📭', text: '还没有规则，点下面「加一条」' })]

  return h('div', null,
    h(ui.Card, {
      title: '关键词自动回复',
      desc: '命中规则就直接回，不消耗模型。规则从上往下匹配，第一条命中生效。',
      right: h(ui.Btn, { small: true, onClick: saveRules }, '保存'),
    },
      rows,
      h(ui.Row, { label: '操作' },
        h(ui.Btn, { small: true, onClick: addRule }, '加一条'),
        h('span', { className: 'ab-muted ab-small', style: { marginLeft: 8 } }, '「包含」找子串，「正则」按正则解释'))),
    h(ui.Card, { title: '试一下', desc: '只跑匹配逻辑，不真的发消息。' },
      h(ui.Row, { label: '测试文本' },
        h('div', { className: 'ab-flex', style: { gap: 6 } },
          h('input', {
            className: 'ab-input',
            placeholder: '输入一句话，看会被哪条规则接住',
            value: probe,
            onChange: function (event: { target: { value: string } }) {
              setProbe(event.target.value)
            },
          }),
          h(ui.Btn, { small: true, onClick: runProbe }, '试一下')))))
}
