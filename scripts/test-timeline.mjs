import { spawnSync } from 'node:child_process';
const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'playwright', 'test', 'tests/timeline-acceptance.spec.ts', '--workers=1'], { stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, TIMELINE_ACCEPTANCE: '1' } });
process.exitCode = result.status ?? 1;
