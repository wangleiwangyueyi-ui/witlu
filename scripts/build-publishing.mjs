import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'packages/web/public');
const read=p=>fs.readFile(path.join(root,p),'utf8');
const write=async(p,s)=>{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,s.replace(/[\t ]+$/gm,'').trimEnd()+'\n');};
const rewrite=s=>s.replaceAll('https://deanchen.me/jiangshan-map','https://witlu.com').replaceAll('https://deanchensj.github.io/jiangshan-map','https://witlu.com').replaceAll('https://deanchen.me','https://witlu.com').replaceAll('scripts/mcp_server.js','scripts/mcp-server.mjs').replaceAll('deanchen.me','witlu.com');
const tokens=await read('packages/web/src/styles/tokens.css');
await write(path.join(out,'licenses/qrcode-MIT.txt'),await read('packages/web/node_modules/qrcode/license'));
await write(path.join(out,'topics/tokens.css'),tokens);
await write(path.join(out,'topics/topics.css'),await read('packages/web/src/styles/topics.css'));
const topics=JSON.parse(await read('packages/web/public/data/topics.json'));
for(const topic of topics){
 const $=load(rewrite(topic.html));
 $('style,script:not([type="application/ld+json"]),link[rel="stylesheet"],meta[http-equiv],meta[name="mobile-agent"]').remove();
 $('[style]').removeAttr('style');
 $('head').append('<link rel="stylesheet" href="/topics/tokens.css"><link rel="stylesheet" href="/topics/topics.css"><link rel="manifest" href="/manifest.webmanifest">');
 $('link[rel="icon"]').attr('href','/brand/seal.svg');$('meta[name="theme-color"]').remove();
 $('meta[property="og:image"],meta[name="twitter:image"]').attr('content','https://witlu.com/brand/og.png');
 $('.brand-link').prepend('<img src="/brand/seal.svg" width="48" height="48" alt="江山玻璃印章">');
 $('footer').append('<p>历史疆域为示意性近似，非测绘边界。致谢 <a href="https://github.com/DeanChensj/jiangshan-map">DeanChensj / jiangshan-map</a> · CHGIS, Version 6, Cambridge: Harvard Yenching Institute, 2016. GPL-3.0.</p>');
 await write(path.join(out,'topics',topic.key+'.html'),$.html());
}
const urls=['/',...topics.map(t=>'/topics/'+t.key+'.html')];
await write(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(p=>'<url><loc>https://witlu.com'+p+'</loc></url>').join('')+'</urlset>');
await write(path.join(out,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://witlu.com/sitemap.xml\n');
await write(path.join(out,'llms.txt'),rewrite(await read('upstream/llms.txt')).replace('- Repository (开源仓库): https://github.com/DeanChensj/jiangshan-map','- Repository (开源仓库): https://github.com/wangleiwangyueyi-ui/witlu\n- Upstream data and design: https://github.com/DeanChensj/jiangshan-map')+'\n## witlu.com deployment\n- Three.js 3D atlas; all resources are self-hosted.\n- Browser API: window.atlasAPI; methods return Promises.\n- MCP stdio: node scripts/mcp-server.mjs (clone this repository with --recurse-submodules).\n- Skill: https://witlu.com/skills/jiangshan-atlas/SKILL.md\n- Topics: https://witlu.com/topics/index.html\n- License: GPL-3.0; upstream and CHGIS attribution retained.\n');
for(const filename of ['SKILL.md','scripts/jiangshan.py']){
 let content=filename.endsWith('.py')?await read('scripts/skill-helper.py'):rewrite(await read('upstream/skills/jiangshan-atlas/'+filename));
 if(filename==='SKILL.md')content=content.replace(/^2\. \*\*Request network access upfront for remote renders.*$/m,'2. **Local queries and screenshots**: In a witlu checkout with its pinned upstream submodule, `--inspect` uses the local MCP adapter. `--out` uses the repository Playwright installation and opens https://witlu.com. For a local preview, set `JIANGSHAN_PUBLIC_URL=http://127.0.0.1:4173`; it does not create or modify files in upstream/. Allow up to 120 seconds for initial terrain loading.');
 if(filename==='SKILL.md')content+='\n\n## witlu.com compatibility\nThis distribution targets https://witlu.com and preserves the upstream GPL-3.0 attribution. Browser atlasAPI methods are asynchronous: await their result. Use `node scripts/mcp-server.mjs` in the witlu checkout for local MCP queries. Legacy terrain=0 is accepted but the map always remains 3D.\n';
 await write(path.join(root,'skills/jiangshan-atlas',filename),content);await write(path.join(out,'skills/jiangshan-atlas',filename),content);
}
const color=n=>tokens.match(new RegExp('--'+n+':\\s*(#[a-fA-F0-9]{6})'))[1];
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="g"><stop stop-color="${color('sea-shelf')}"/><stop offset="1" stop-color="${color('sky')}"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/><path d="M0 500Q300 180 600 400T1200 220" fill="none" stroke="${color('polity-main')}" stroke-opacity=".3" stroke-width="90"/><text x="100" y="270" fill="${color('text')}" font-size="100" font-family="SimSun,serif">江山</text><text x="100" y="370" fill="${color('polity-main')}" font-size="40" font-family="SimSun,serif">两千四百年 · 一图观之</text><text x="100" y="530" fill="${color('text')}" font-size="26">witlu.com · 中国历代疆域</text></svg>`;
await sharp(Buffer.from(svg)).composite([{input:await fs.readFile(path.join(out,'brand/seal-192.png')),left:900,top:200}]).png().toFile(path.join(out,'brand/og.png'));
console.log(`Prerendered ${topics.length} topics, sitemap, OG, llms and Skill for witlu.com`);
