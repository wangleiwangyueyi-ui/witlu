import {useEffect,useState} from 'react';
import {useReducedEffects} from './Glass';
import {useShell} from '../state/shell';
import {create} from 'zustand';
type OrientationPermission=typeof DeviceOrientationEvent & {requestPermission?:()=>Promise<string>};
const useSensor=create<{enabled:boolean}>(()=>({enabled:false}));
export function MotionSensorDriver(){const enabled=useSensor(s=>s.enabled),reduced=useReducedEffects();
 useEffect(()=>{if(!enabled||reduced)return;const move=(e:DeviceOrientationEvent)=>{if(document.hidden)return;const root=document.documentElement;root.style.setProperty('--gyro-x',`${50+Math.max(-25,Math.min(25,e.gamma??0))}%`);root.style.setProperty('--gyro-y',`${30+Math.max(-20,Math.min(20,(e.beta??30)-30))}%`);root.dataset.gyro='true';};window.addEventListener('deviceorientation',move);return()=>{window.removeEventListener('deviceorientation',move);delete document.documentElement.dataset.gyro;};},[enabled,reduced]);return null;
}
export function MotionSensor(){
  const enabled=useSensor(s=>s.enabled),setEnabled=(value:boolean)=>useSensor.setState({enabled:value}),[message,setMessage]=useState(''),reduced=useReducedEffects(),locale=useShell(s=>s.locale);
  const en=locale==='en',hant=locale==='zh-Hant';
  const toggle=async()=>{if(enabled){setEnabled(false);return;}try{if(typeof DeviceOrientationEvent==='undefined')throw Error('unavailable');const permission=(DeviceOrientationEvent as OrientationPermission).requestPermission;if(permission&&await permission.call(DeviceOrientationEvent)!=='granted')throw Error('denied');setMessage('');setEnabled(true);}catch{setMessage(en?'Motion permission is unavailable or was declined.':hant?'無法使用動作感測器，或尚未授權。':'无法使用动作传感器，或尚未授权。');}};
  return <><button type="button" role="switch" className="toggle-row" aria-checked={enabled} disabled={reduced} onClick={()=>void toggle()}>{en?'Tilt-controlled highlights':hant?'傾斜控制玻璃高光':'倾斜控制玻璃高光'}<i aria-hidden="true"><b/></i></button>{message&&<p role="status">{message}</p>}</>;
}
