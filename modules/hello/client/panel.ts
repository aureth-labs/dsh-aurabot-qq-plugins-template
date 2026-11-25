declare const React: any
declare const h: any
declare const ui: any
declare const call: (path: string, body?: any) => Promise<any>

interface PanelProps {
  toast(message: string, kind?: string): void
}

export default function HelloPanel(props: PanelProps) {
  var toast = props.toast;
  var infoState = React.useState(null);
  var info = infoState[0];
  var setInfo = infoState[1];

  function load() {
    call('/info')
      .then(function (r) { setInfo(r || {}); })
      .catch(function (e) { toast(e.message, 'err'); });
  }

  React.useEffect(function () { load(); }, []);

  var rows = info
    ? [
        h(ui.Row, { key: 'g', label: '问候语' }, h('code', null, info.greeting || '（空）')),
        h(ui.Row, { key: 'e', label: '总开关' }, h('span', null, info.enabled ? '已启用' : '已关闭')),
      ]
    : h(ui.Empty, { icon: '⏳', text: '加载中…' });

  return h('div', { className: 'ab-grid' },
    h(ui.Card, {
      title: '示例插件',
      desc: '这个面板只读，用来确认 /info 路由通了、面板文件被正确加载。',
    }, rows));
}
