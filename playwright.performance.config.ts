import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, testMatch: 'terrain-performance.spec.ts', fullyParallel: false, workers: 1, use: { ...base.use, trace: 'off' } });
