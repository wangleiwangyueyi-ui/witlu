import { useI18n } from '../i18n';
export const CHGIS_CITATION = 'CHGIS, Version: 6. © Fairbank Center for Chinese Studies of Harvard University and the Center for Historical Geographical Studies at Fudan University, 2016.';
export function Credits() { const { t } = useI18n(); return <footer className="credits"><p>{t('disclaimer')}</p><p>{t('credit')} <a href="https://github.com/DeanChensj/jiangshan-map" target="_blank" rel="noreferrer">{t('upstream')}</a> · GPL-3.0</p><p>{CHGIS_CITATION}</p></footer>; }
