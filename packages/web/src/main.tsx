import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
interface Manifest { upstreamCommit: string; counts: Record<string, number> }
function App() {
  const [data, setData] = useState<Manifest>();
  const [error, setError] = useState('');
  useEffect(() => { fetch('/data/manifest.json').then(r => { if (!r.ok) throw new Error('请先运行 pnpm data'); return r.json() as Promise<Manifest>; }).then(setData).catch((e: Error) => setError(e.message)); }, []);
  return <main><p>WITLU · 中国历代疆域</p><h1>江山，始于一份完整的史料。</h1><p>P0 · 工程与数据基座</p>
    <p className="status" role="status">{error || (data ? '全部图层与史料已导入' : '正在读取数据索引…')}</p>
    {data && <><div className="counts">{Object.entries(data.counts).map(([label, count]) => <div className="metric" key={label}><strong>{count.toLocaleString('zh-CN')}</strong>{label}</div>)}</div><p>上游固定版本：<code>{data.upstreamCommit.slice(0, 12)}</code></p></>}
    <details><summary>关于与数据出处</summary><p>数据与原始设计源自 <a href="https://github.com/DeanChensj/jiangshan-map">江山时序 Jiangshan Atlas</a>。代码及上游自创数据采用 GPL-3.0。CHGIS 郡州府层与现代省界遵循各自条款，完整来源见仓库 NOTICE.md。</p><p>main 沿用上游按《资治通鉴》纪年惯例确定的主政权标注，不代表正统评价。</p><p>CHGIS, Version: 6. © Fairbank Center for Chinese Studies of Harvard University and the Center for Historical Geographical Studies at Fudan University, 2016.</p></details>
    <footer>历史疆域为示意性近似，非测绘边界。<br/>数据与原始设计源自 <a href="https://github.com/DeanChensj/jiangshan-map">江山时序 Jiangshan Atlas</a> · GPL-3.0<br/>CHGIS, Version: 6. © Fairbank Center for Chinese Studies of Harvard University and the Center for Historical Geographical Studies at Fudan University, 2016.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
