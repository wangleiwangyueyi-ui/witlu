import { spawn } from 'node:child_process';
// Invoke the local JS CLI directly: no platform-specific environment syntax.
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.performance.config.ts', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, P2_PERFORMANCE: '1' } });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); process.exitCode = 1; });
