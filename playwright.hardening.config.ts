import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'hardening.spec.ts',use:{...base.use,baseURL:'http://127.0.0.1:4178'},webServer:{command:'pnpm --filter @witlu/web dev --port 4178',url:'http://127.0.0.1:4178',reuseExistingServer:true}});
