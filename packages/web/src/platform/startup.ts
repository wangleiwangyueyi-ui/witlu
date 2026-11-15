// Let the first low-resolution terrain tiles use the connection before the
// complete search, chronology and place catalogues. Failure must also unblock UI.
let ready = false;
let release: (() => void) | undefined;
let pending: Promise<void> | undefined;
export function releaseStartupData() { ready = true; release?.(); }
export async function fetchAfterTerrain(input: RequestInfo | URL, init?: RequestInit) {
  if (!ready && location.pathname === '/') {
    pending ??= new Promise<void>(resolve => {
      const timer = setTimeout(releaseStartupData, 8000);
      release = () => { clearTimeout(timer); resolve(); };
    });
    await pending;
  }
  return fetch(input, init);
}
