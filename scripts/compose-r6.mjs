import fs from 'node:fs/promises';
import sharp from 'sharp';

const source='.cache/r6-frames';
const proof='docs/progress/screenshots/R6';
const audit='docs/progress/performance/R6';
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const name = (year,caption) => `${year < 0 ? '前' + -year : year} · ${caption.replace(/^图例 · /,'').replace(/ \d+\/\d+$/,'')}`;

for (const [device,cols,width,height] of [['desktop',3,641,400],['iPhone-14',6,226,385],['Pixel-7',6,226,460]]) {
  const cards = JSON.parse(await fs.readFile(`${audit}/${device}-audit.json`,'utf8'));
  if(cards.length!==18)throw new Error(`Need 18 screenshots for ${device}`);
  const gutter=10, tag=30, row=height+tag+gutter, padding=gutter;
  const imageWidth=cols*(width+gutter)+padding, imageHeight=Math.ceil(cards.length/cols)*row+padding;
  const panels=[];
  for(const [i,card] of cards.entries()){
    const left=padding+(i%cols)*(width+gutter), top=padding+Math.floor(i/cols)*row, title=escape(name(card.year,card.chapter));
    panels.push({left,top,input:await sharp(`${source}/${device}-${card.year}.png`).resize(width,height,{fit:'contain',background:'#0A1830'}).png().toBuffer()});
    panels.push({left,top:top+height,input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${tag}"><text x="7" y="21" font-size="15" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif">${title}</text></svg>`)});
  }
  await sharp({create:{width:imageWidth,height:imageHeight,channels:3,background:'#0A1830'}}).composite(panels).webp({quality:91}).toFile(`${proof}/${device}-18-chapters.webp`);
}
