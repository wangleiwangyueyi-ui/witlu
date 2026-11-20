import { App } from '../App';

export default function OpeningLab() {
  const raw = new URLSearchParams(location.search).get('frame');
  const frame = raw !== null && /^\d+$/.test(raw) ? Number(raw) : undefined;
  return <App openingPreview openingFrame={frame}/>;
}
