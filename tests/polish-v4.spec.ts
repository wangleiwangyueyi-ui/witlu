import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs/promises';
import type { EngineStats } from '../packages/engine/Renderer';

const proof='docs/progress/screenshots/R6';
const numbers='docs/progress/performance/R6';
const frames='.cache/r6-frames';
const years=[-350,-221,-100,100,230,300,383,500,589,750,950,1080,1140,1300,1450,1700,1936,2020];
const stats=async (page:Page)=>JSON.parse(await page.getByTestId('terrain').getAttribute('data-stats')??'{}') as EngineStats;
const welcome=(page:Page)=>page.getByRole('complementary',{name:'初来乍到',exact:true});

async function atlasReady(page:Page){
  await expect(page.getByTestId('terrain')).toHaveAttribute('data-ready','true',{timeout:45000});
  await expect.poll(async()=>{const s=await stats(page);return !!s.morph?.ready&&!s.morph?.preparing&&!s.morph?.playing;},{timeout:45000}).toBe(true);
  await expect(page.locator('.polity-labels [data-neighbor=false]:visible').first()).toBeVisible();
}

async function visualAudit(page:Page){
  return page.evaluate(()=>{
    const atlas=document.querySelector<HTMLElement>('.atlas-app')!;
    const selectors='.app-header,.chronicle-sidebar,.chapter-sheet,.map-legend,.flat-map-controls,.map-event-card,.time-dock,.polity-labels,.place-label,.welcome-strip';
    const visible=(node:HTMLElement)=>{
      if(!node.checkVisibility({visibilityProperty:true,opacityProperty:true})||node.closest('.sr-only, [hidden]'))return false;
      const r=node.getBoundingClientRect();
      return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
    };
    const rect=(node:HTMLElement)=>{
      const r=node.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,name:node.textContent?.trim()};
    };
    const overlaps=(a:ReturnType<typeof rect>,b:ReturnType<typeof rect>)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
    const collect=(selector:string)=>Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(visible).map(rect);
    const political=collect('.polity-labels strong'),core=collect('.polity-labels [data-neighbor=false] strong'),places=collect('.place-label'),cards=collect('.map-event-card');
    const labelClashes=[...political,...places].flatMap((first,i,items)=>items.slice(i+1).filter(second=>overlaps(first,second)).map(second=>[first.name,second.name]));
    const eventClashes=cards.flatMap(card=>core.filter(label=>overlaps(card,label)).map(label=>label.name));
    const texts=Array.from(atlas.querySelectorAll<HTMLElement>('*')).filter(node=>node instanceof HTMLElement&&node.closest(selectors)&&visible(node)&&
      Array.from(node.childNodes).some(child=>child.nodeType===Node.TEXT_NODE&&child.textContent?.trim())&&
      (node.tagName!=='SUMMARY'||node.closest('details')?.open||node.matches('.map-legend > summary')));
    const fontRows=texts.map(node=>({size:parseFloat(getComputedStyle(node).fontSize),name:node.textContent?.trim().slice(0,65),className:node.className}));
    const token=(name:string)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const color=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const luminance=(c:number[])=>c.map(n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i]!,0);
    const contrast=(fg:number[],bg:number[])=>(luminance(fg)+.05)/(luminance(bg)+.05);
    const ratio=(a:string,b:string)=>contrast(color(token(a)),color(token(b)));
    const sea=color(token('--sea-deep')), white=color(token('--text'));
    const mutedAlpha=Number(token('--text-secondary').match(/(\d+)%/)?.[1])/100;
    const minMuted=contrast(white.map((v,i)=>v*mutedAlpha+sea[i]!*(1-mutedAlpha)),sea);
    const surface=atlas.querySelector<HTMLCanvasElement>('.terrain-canvas')!.getBoundingClientRect(), dock=atlas.querySelector<HTMLElement>('.timeline-dock')!.getBoundingClientRect();
    const central={left:surface.left+surface.width*.22,right:surface.left+surface.width*.78,top:surface.top+surface.height*.29,bottom:surface.top+surface.height*.69,name:'center'};
    return {fontMin:Math.min(...fontRows.map(row=>row.size)),small:fontRows.filter(row=>row.size<12),
      contrasts:{card:ratio('--text','--sky'),control:ratio('--text','--sea-deep'),outline:ratio('--text','--sky'),secondary:minMuted},
      coreLabels:core.map(r=>r.name),placeCount:places.length,labelClashes,eventClashes,
      cards,centralCards:cards.filter(card=>overlaps(card,central)).length,dockHeight:dock.height,
      laneFont:parseFloat(getComputedStyle(atlas.querySelector<HTMLElement>('.lane-name')!).fontSize),
      glassOutside:Array.from(atlas.querySelectorAll<HTMLElement>('.polity-labels .glass,.place-label.glass,.map-legend.glass,.weather-story-caption.glass')).filter(visible).length,
    };
  });
}

test('R6 responsive dock and mapped popup preserve the polity labels',async({page},info)=>{
  await page.goto('/?year=230');
  await atlasReady(page);
  await expect(page.locator('.map-event-card:visible').first()).toBeVisible();
  const audit=await visualAudit(page);
  expect(audit.eventClashes).toEqual([]);
  expect(audit.small).toEqual([]);
  expect(audit.laneFont).toBeGreaterThanOrEqual(12);
  for(const ratio of Object.values(audit.contrasts))expect(ratio).toBeGreaterThanOrEqual(7);
  expect(audit.glassOutside).toBe(0);
  if(info.project.name==='desktop'){
    expect(audit.dockHeight).toBeGreaterThanOrEqual(88);
    expect(audit.dockHeight).toBeLessThanOrEqual(96);
  }else{
    expect(audit.dockHeight).toBe(96);
    expect(audit.centralCards).toBe(0);
  }
});

test('R6 first-visit help can be dismissed and opens each real feature',async({page},info)=>{
  test.setTimeout(85000);
  await page.addInitScript(()=>localStorage.setItem('witlu-intro-enabled','false'));
  await page.goto('/');
  await expect(welcome(page)).toBeVisible();
  await page.getByRole('button',{name:'关闭新手提示',exact:true}).click();
  await page.reload();
  await expect(welcome(page)).toHaveCount(0);
  if(info.project.name!=='desktop')return;

  async function reopen(){await page.evaluate(()=>localStorage.removeItem('witlu-start-guide-v1'));await page.goto('/');await expect(welcome(page)).toBeVisible();}
  await reopen();
  await welcome(page).getByRole('button',{name:'寻一处故地',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'万能搜索'})).toBeVisible();
  await reopen();
  await welcome(page).getByRole('button',{name:'古地名小试',exact:true}).click();
  await expect(page.locator('.quiz-panel')).toBeVisible();
  await reopen();
  await welcome(page).getByRole('button',{name:'导览',exact:true}).click();
  await expect(page.getByRole('button',{name:'暂停导览',exact:true})).toBeVisible();
});

test('R6 site weather stays quiet outside major events and caps automatic effects',async({page},info)=>{
  test.skip(info.project.name!=='desktop','One stable weather director covers all viewport sizes');
  await page.goto('/?year=230');
  await atlasReady(page);
  expect((await stats(page)).weather.active).toBe(false);
  await page.goto('/?year=1127');
  await atlasReady(page);
  await expect.poll(async()=>(await stats(page)).weather.active).toBe(true);
  const w=(await stats(page)).weather;
  expect(Object.values(w.particles).reduce((a,b)=>a+b,0)).toBeLessThan(2400);
  expect([w.lightning,w.fire,w.flood]).toEqual([false,false,false]);
});

test('R6 renders and audits one snapshot for each of the eighteen chapters',async({page},info)=>{
  test.skip(process.env.R6_ACCEPTANCE!=='1','Dedicated screenshot montage capture');
  test.setTimeout(410000);
  await Promise.all([frames,proof,numbers].map(dir=>fs.mkdir(dir,{recursive:true})));
  const audits=[];
  for(const year of years){
    await page.goto(`/?year=${year}`);
    await atlasReady(page);
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(260);
    const audit=await visualAudit(page);
    expect(audit.eventClashes,`event cards in ${year}`).toEqual([]);
    expect(audit.labelClashes,`map labels in ${year}`).toEqual([]);
    expect(audit.small,`fonts in ${year}`).toEqual([]);
    if(info.project.name!=='desktop')expect(audit.centralCards,`mobile cards in ${year}`).toBe(0);
    for(const ratio of Object.values(audit.contrasts))expect(ratio).toBeGreaterThanOrEqual(7);
    const stat=await stats(page),chapter=await page.locator('.map-legend > summary').textContent();
    const name=`${info.project.name}-${year}.png`;
    await page.screenshot({path:`${frames}/${name}`,scale:'css'});
    if([230,1127].includes(year))await fs.copyFile(`${frames}/${name}`,`${proof}/${name}`);
    audits.push({year,chapter,snapshot:stat.morph.snapshotB,...audit});
  }
  await fs.writeFile(`${numbers}/${info.project.name}-audit.json`,JSON.stringify(audits,null,2)+'\n');
  for(const [t,label] of [[1500,'polar'],[3000,'outline']] as const){
    await page.goto(`/lab/opening?frame=${t}`);
    await expect(page.locator('.opening-screen')).toHaveAttribute('data-elapsed',`${t}.0`,{timeout:45000});
    await page.screenshot({path:`${proof}/${info.project.name}-${label}.png`,scale:'css'});
  }
  await page.addInitScript(()=>localStorage.setItem('witlu-intro-enabled','false'));
  await page.goto('/');
  await expect(welcome(page)).toBeVisible();
  await atlasReady(page);
  await page.screenshot({path:`${proof}/${info.project.name}-welcome.png`,scale:'css'});
});
