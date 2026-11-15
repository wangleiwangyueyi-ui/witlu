export async function loadDebugConsole(){
  if(new URLSearchParams(location.search).get('debug')!=='1')return;
  const {default:VConsole}=await import('vconsole');
  new VConsole({theme:'dark',defaultPlugins:['system','network','element','storage']});
}
