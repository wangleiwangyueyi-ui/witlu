import type { Chronicle } from '../store/chronicle';
import type { Locale } from './messages';
import type { Chapter, ChronicleEvent, RegistryPolity } from '@witlu/core/time';
export function historicalText(text: string, locale: Locale, data?: Chronicle) {
  if (locale === 'zh-Hant') return [...text].map(c => data?.translations.hant.CHAR_S2T[c] ?? c).join('');
  return locale === 'en' ? data?.translations.en.dict[text] ?? text : text;
}
export function chapterName(chapter: Chapter, locale: Locale, data?: Chronicle) { return locale === 'en' ? data?.translations.en.dynasties[chapter.key]?.name ?? chapter.title : historicalText(chapter.title, locale, data); }
export function polityName(polity: RegistryPolity, locale: Locale, data?: Chronicle) { return locale === 'en' ? polity.en ?? polity.zh ?? polity.titles[0] ?? polity.key : historicalText(polity.zh ?? polity.titles[0] ?? polity.key, locale, data); }
export function eventTitle(event: ChronicleEvent, locale: Locale, data?: Chronicle) { return locale === 'en' && event.kind === 'milestone' ? data?.translations.en.milestones[`${event.dynastyKey}:${event.year}`]?.[0] ?? event.title : historicalText(event.title, locale, data); }
