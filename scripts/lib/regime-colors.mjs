import fs from 'node:fs';

export const minColorDistance = 8;
const names = ['indigo','ochre','pine','plum','rose','olive','teal','mauve','lavender','leaf'];
export function regimeTokens() {
  const css = fs.readFileSync(new URL('../../packages/web/src/styles/tokens.css', import.meta.url), 'utf8');
  return names.map(name => {
    const color = css.match(new RegExp(`--regime-${name}:\\s*(#[a-f0-9]{6})`, 'i'))?.[1];
    if (!color) throw Error(`Missing regime token: ${name}`);
    return color;
  });
}

const simulations = {
  normal: [[1,0,0],[0,1,0],[0,0,1]],
  protanopia: [[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],
  deuteranopia: [[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.011820,.042940,.968881]],
  tritanopia: [[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.303900]],
};
const dot = (a,b) => a.reduce((sum,x,i) => sum+x*b[i],0);
const clamp = x => Math.min(1,Math.max(0,x));
function linear(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(s=>s<=.04045?s/12.92:((s+.055)/1.055)**2.4);}
const lab = ([r,g,b]) => {
  const rgb = [r,g,b], xyz = [[.4124564,.3575761,.1804375],[.2126729,.7151522,.072175],[.0193339,.119192,.9503041]];
  const [x,y,z] = xyz.map((row,i)=>dot(row,rgb)/[.95047,1,1.08883][i]).map(t=>t>.008856?Math.cbrt(t):7.787*t+16/116);
  return [116*y-16,500*(x-y),200*(y-z)];
};
export const lightness = hex => lab(linear(hex))[0];
const cache = new Map();
function vectors(hex) {
  if(!cache.has(hex)) cache.set(hex,Object.values(simulations).map(matrix=>lab(matrix.map(row=>clamp(dot(row,linear(hex)))))));
  return cache.get(hex);
}
export function separation(a,b) {
  const av=vectors(a),bv=vectors(b);
  return Math.min(...av.map((x,i)=>Math.hypot(...x.map((v,j)=>v-bv[i][j]))));
}
export function simulatedColor(hex, mode) {
  const encoded=simulations[mode].map(row=>clamp(dot(row,linear(hex)))).map(v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
  return '#'+encoded.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
}
