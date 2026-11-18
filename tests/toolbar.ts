import type {Page} from '@playwright/test';
export async function ensureToolbar(page:Page,name:string){
 if(/^(播放古琴|暂停古琴)$/.test(name)&&!await page.getByRole('button',{name,exact:true}).isVisible()){await clickToolbar(page,'古琴与解说');return;}
 if(!await page.getByRole('button',{name,exact:true}).isVisible())await page.getByRole('button',{name:/^(更多|More|更多選項)$/,exact:true}).click();
}
export async function clickToolbar(page:Page,name:string){await ensureToolbar(page,name);await page.getByRole('button',{name,exact:true}).click();}
