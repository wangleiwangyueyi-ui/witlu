import { messages } from './messages';
import { useCallback } from 'react';
import type { MessageKey } from './messages';
import { useShell } from '../state/shell';
export function useI18n() {
  const locale = useShell(s => s.locale);
  const t = useCallback((key: MessageKey) => messages[locale][key], [locale]);
  return { locale, t };
}
