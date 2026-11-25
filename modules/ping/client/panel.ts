declare const React: any
declare const h: any
declare const ui: any
declare const call: (path: string, body?: any) => Promise<any>

interface PanelProps {
  toast(message: string, kind?: string): void
}

export default function PingPanel(props: PanelProps) {
  var toast = props.toast;
  var state = React.useState(null);
  var result = state[0];
  var setResult = state[1];
  var busyState = React.useState(false);
  var busy = busyState[0];
  var setBusy = busyState[1];

  function probe() {
    setBusy(true);
    var startedAt = Date.now();
    call('/ping')
      .then(function (r) {
        setResult({ ok: !!(r && r.ok), at: (r && r.at) || '', uptimeMs: (r && r.uptimeMs) || 0, cost: Date.now() - startedAt });
        setBusy(false);
      })
      .catch(function (e) { toast(e.message, 'err'); setBusy(false); });
  }

  var button = h(ui.Btn, { onClick: probe, disabled: busy }, busy ? '探测中…' : '测一下');
  var body = result
    ? h('div', null,
        h(ui.Row, { label: '结果' }, h('b', null, result.ok ? '通' : '不通')),
        h(ui.Row, { label: '耗时' }, h('span', null, result.cost + ' ms')),
        h(ui.Row, { label: '服务器时间' }, h('code', null, result.at || '—')),
        h(ui.Row, { label: '运行时长' }, h('span', null, Math.round(result.uptimeMs / 1000) + ' 秒')))
    : h(ui.Empty, { icon: '📡', text: '点上面的按钮试试' });

  return h('div', { className: 'ab-grid' },
    h(ui.Card, { title: '探活', desc: '面板通过 call() 调本模块的 /ping 路由，不经过网络。', extra: button }, body));
}
