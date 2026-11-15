/** A fresh canonical URL keeps development ports out of shared links. */
export function shareURL(search:string,year:number){
 const url=new URL('https://witlu.com/');url.search=search;
 for(const key of ['debug','embed','lock'])url.searchParams.delete(key);
 if(!(url.searchParams.get('place')&&/[,，、;；]/.test(url.searchParams.get('year')??'')))url.searchParams.set('year',String(year));
 return url.href;
}
