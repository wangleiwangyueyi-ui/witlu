import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('P10 all upstream README links retain their destination',async({page},info)=>{
 test.skip(info.project.name!=='desktop');test.setTimeout(900000);
 const queries=new Set<string>();for(const name of (await fs.readdir('upstream')).filter(n=>/^README.*\.md$/.test(n))){const markdown=await fs.readFile('upstream/'+name,'utf8');for(const m of markdown.matchAll(/https:\/\/deanchen.me\/jiangshan-map\/\?[^\s)<>"`*[\]]+/g))queries.add(new URL(m[0]).search);}
 const results=[];for(const query of queries){const params=new URLSearchParams(query);await page.goto('/'+query);await expect(page.getByTestId('data-status')).toContainText(/全量史料|Complete source/,{timeout:45000});
  if(params.has('person')||params.has('event')){await expect(page.locator('.exploration-panel')).toBeVisible();expect(Number(await page.locator('.exploration-panel').getAttribute('data-stop-count'))).toBeGreaterThan(0);}
  else if(params.has('quiz'))await expect(page.locator('.quiz-panel')).toBeVisible();
  else if(params.has('place')||params.has('trace'))await expect(page.locator('.place-card')).toBeVisible({timeout:45000});
  else if(params.has('hover'))await expect(page.locator('.map-bubble')).toBeVisible();
  if(params.has('year')&&!params.has('quiz'))await expect(page.locator('#history-year')).toHaveValue(params.get('year')!.split(',')[0]!);
  if(params.get('lang')==='zh-tw')await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');if(params.get('lang')==='en')await expect(page.locator('html')).toHaveAttribute('lang','en');
  results.push({query,passed:true});console.log('P10 README '+results.length+'/'+queries.size);
 }expect(results.length).toBeGreaterThan(0);await fs.mkdir('docs/progress/performance/P10',{recursive:true});await fs.writeFile('docs/progress/performance/P10/readme-links.json',JSON.stringify(results,null,2));
});
