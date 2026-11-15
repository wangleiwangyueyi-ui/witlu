import {initialQuality} from '../../../engine/Quality';
export function deviceQuality(){
  const device=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean;effectiveType?:string}};
  return initialQuality({mobile:matchMedia('(pointer:coarse)').matches,memoryGB:device.deviceMemory,cores:device.hardwareConcurrency,saveData:device.connection?.saveData,network:device.connection?.effectiveType});
}
export function installMobileViewport(){
  const update=()=>{const v=window.visualViewport;const style=document.documentElement.style;style.setProperty('--viewport-height',`${v?.height??innerHeight}px`);style.setProperty('--viewport-top',`${v?.offsetTop??0}px`);};
  update();window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);window.addEventListener('resize',update);
}
