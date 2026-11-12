import { useId } from 'react';
const paths = {
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm5-1 5 5',
  layers: 'm2 8 10-5 10 5-10 5L2 8Zm0 5 10 5 10-5M2 18l10 5 10-5',
  music: 'M9 18V5l12-2v13M9 8l12-2M9 18c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Zm12-2c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Z',
  language: 'M3 4h12M9 2v2m-4 3c1 5 4 8 9 10M13 4c-1 6-4 11-10 14m11 4 5-13 5 13m-8-4h6',
  share: 'M12 16V2m-5 5 5-5 5 5M5 12H3v10h18V12h-2',
  play: 'm8 4 12 8-12 8V4Z', pause: 'M7 4v16M17 4v16',
  previous: 'M5 4v16M20 4 8 12l12 8V4Z', next: 'M19 4v16M4 4l12 8-12 8V4Z',
  compass: 'm16 8-3 7-7 3 3-7 7-3ZM12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01', close: 'm5 5 14 14M19 5 5 19',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3V7Zm9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  chevron: 'm6 9 6 6 6-6', check: 'm4 12 5 5L20 6',
} as const;
export type IconName = keyof typeof paths;
export function GlassIcon({ name, className = '' }: { name: IconName; className?: string }) {
  const uid = useId().replaceAll(':', '');
  return <svg className={`glass-icon ${className}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--land-ridge)" stopOpacity=".7"/><stop offset="1" stopColor="var(--sea-deep)" stopOpacity=".9"/></linearGradient><linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--text)" stopOpacity=".42"/><stop offset="1" stopColor="var(--sea-flow)" stopOpacity=".28"/></linearGradient></defs>
    <rect x="9" y="13" width="46" height="46" rx="17" fill="var(--sky)" opacity=".6"/>
    <rect x="9" y="8" width="46" height="46" rx="17" fill={`url(#${uid}-body)`} stroke={`url(#${uid}-rim)`}/>
    <path d="M17 17Q31 10 46 17" fill="none" stroke="var(--text)" strokeOpacity=".28" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M18 47Q32 53 46 46" fill="none" stroke="var(--sea-flow)" strokeOpacity=".4" strokeWidth="2"/>
    <g transform="translate(20 19)" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3.8 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></g>
  </svg>;
}
