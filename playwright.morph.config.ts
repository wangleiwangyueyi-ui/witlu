import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:['morph-acceptance.spec.ts','morph-sequence.spec.ts'],fullyParallel:false,workers:1,timeout:150000,
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',launchOptions:{args:process.platform==='win32'?['--use-angle=d3d11','--enable-gpu']:[]}},
  webServer:{command:'pnpm --filter @witlu/web dev --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
  projects:[{name:'desktop',use:{browserName:'chromium',viewport:{width:1440,height:900}}},{name:'iPhone-14',use:{...devices['iPhone 14'],defaultBrowserType:'chromium'}},{name:'Pixel-7',use:{...devices['Pixel 7']}}]
});
