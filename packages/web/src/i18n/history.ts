import type { Chronicle } from '../store/chronicle';
import type { Locale } from './messages';
import type { Chapter, ChronicleEvent, RegistryPolity, ActiveTrack } from '@witlu/core/time';
export function historicalText(text: string, locale: Locale, data?: Chronicle) {
  if (locale === 'zh-Hant') return [...text].map(c => data?.translations.hant.CHAR_S2T[c] ?? c).join('');
  return locale === 'en' ? data?.translations.en.dict[text] ?? text : text;
}
export function chapterName(chapter: Chapter, locale: Locale, data?: Chronicle) { return locale === 'en' ? data?.translations.en.dynasties[chapter.key]?.name ?? chapter.title : historicalText(chapter.title, locale, data); }
export function polityName(polity: RegistryPolity, locale: Locale, data?: Chronicle) { return locale === 'en' ? polity.en ?? polity.zh ?? polity.titles[0] ?? polity.key : historicalText(polity.zh ?? polity.titles[0] ?? polity.key, locale, data); }
export function eventTitle(event: ChronicleEvent, locale: Locale, data?: Chronicle) { return locale === 'en' && event.kind === 'milestone' ? data?.translations.en.milestones[`${event.dynastyKey}:${event.year}`]?.[0] ?? event.title : locale === 'en' ? event.en ?? historicalText(event.title, locale, data) : historicalText(event.title, locale, data); }

const eraPrefixes = /^(南朝[宋齐梁陈]|[东西]汉|新莽|[东西]晋|[北东西]魏|北[齐周]|西梁|武周|后[梁唐晋汉周]|[北南]宋|蜀汉|西夏|[周秦汉魏吴晋宋齐梁陈隋唐辽金元明清])/u;
const numerals = '零一二三四五六七八九';
function eraOrdinal(n: number) {
  if (n < 1 || n >= 100) return String(n);
  if (n === 1) return '元';
  if (n < 10) return numerals[n];
  return (n >= 20 ? numerals[Math.floor(n / 10)] : '') + '十' + (n % 10 ? numerals[n % 10] : '');
}

export function reignText(era: NonNullable<ActiveTrack['era']>, locale: Locale, data?: Chronicle, separator = ' ') {
  if (locale === 'en') return [era.rulerEn || era.ruler, `${historicalText(era.name,locale,data)} Year ${era.ordinal}`].filter(Boolean).join(separator);
  const shortened = era.name.replace(eraPrefixes,'');
  const name = era.ruler && shortened ? shortened : era.name;
  const reign = name === era.ruler ? '' : era.ruler;
  return historicalText([reign,`${name}${eraOrdinal(era.ordinal)}年`].filter(Boolean).join(separator),locale,data);
}
