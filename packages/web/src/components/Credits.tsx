import { useChronicleText } from '../i18n/chronicle';
import { useI18n } from '../i18n';
export const CHGIS_CITATION = 'CHGIS, Version: 6. © Fairbank Center for Chinese Studies of Harvard University and the Center for Historical Geographical Studies at Fudan University, 2016.';
export function Credits() { const { t } = useI18n(); const ct=useChronicleText(); return <footer className="credits"><p>{t('disclaimer')}</p><p>{t('credit')} <a href="https://github.com/DeanChensj/jiangshan-map" target="_blank" rel="noreferrer">{t('upstream')}</a> · GPL-3.0</p><p>{CHGIS_CITATION}</p><p><a href="https://github.com/skishore/makemeahanzi">{ct('calligraphyCredit')}</a> · <a href="/calligraphy/ARPHIC-LICENSE.txt">Arphic Public License</a></p></footer>; }
