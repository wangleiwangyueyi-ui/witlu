import { useEffect, useState } from 'react';
import { shareURL } from '../state/share-url';
import { useShell } from '../state/shell';
import { GlassButton } from './Glass';
import { useExploreText } from './Explore';

export function SharePoster() {
  const t = useExploreText(), locale = useShell(s => s.locale);
  const [share,setShare] = useState<{year:number;url:string}>();
  const [poster,setPoster] = useState(''), [error,setError] = useState('');
  const [copy,setCopy] = useState<'idle'|'copied'|'manual'>('idle');

  useEffect(() => {
    const show = () => {
      const year = useShell.getState().year;
      setPoster(''); setError(''); setCopy('idle');
      setShare({year,url:shareURL(location.search,year)});
    };
    window.addEventListener('atlas:share',show);
    return () => window.removeEventListener('atlas:share',show);
  }, []);
  useEffect(() => {
    if (!share) return;
    let alive = true;
    void import('./render-share-poster')
      .then(({renderSharePoster}) => renderSharePoster(share.year,locale,share.url))
      .then(image => { if (alive) setPoster(image); })
      .catch(() => { if (alive) setError('poster'); });
    const escape = (event:KeyboardEvent) => { if (event.key === 'Escape') setShare(undefined); };
    window.addEventListener('keydown',escape);
    return () => { alive = false; window.removeEventListener('keydown',escape); };
  }, [share,locale]);

  if (!share) return null;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(share.url); setCopy('copied'); }
    catch { setCopy('manual'); }
  };

  return <div className="share-backdrop" data-capture-ignore="true">
    <section className="glass share-dialog" role="dialog" aria-modal="true" aria-label={t('分享海报','Share poster')}>
      <header><h2>{t('把此刻江山寄给朋友','Share this moment')}</h2>
        <GlassButton icon="close" label={t('关闭','Close')} onClick={() => setShare(undefined)}/>
      </header>
      {poster ? <img className="share-poster" src={poster} draggable={false}
        alt={t('江山二维分享海报，含二维码及历史疆域免责声明','North-up atlas poster with QR code and boundary disclaimer')}/>
        : <p role="status">{error ? t('海报未能绘制，请关闭后重试。','Could not draw the poster. Close and try again.')
          : t('正在绘制海报…','Drawing poster…')}</p>}
      {poster && <p>{t('长按保存 / 发送给朋友','Touch and hold to save or send to a friend')}</p>}
      <nav>
        {poster && <a download={`witlu-${share.year}.png`} href={poster}>{t('保存海报','Save poster')}</a>}
        <GlassButton onClick={() => { void copyLink(); }}>{copy === 'copied' ? t('已复制','Copied') : t('复制链接','Copy link')}</GlassButton>
      </nav>
      {copy === 'manual' && <label className="share-manual-link">
        {t('长按链接选择复制','Touch and hold to copy the link')}
        <input value={share.url} readOnly onFocus={event => event.currentTarget.select()}/>
      </label>}
    </section>
  </div>;
}
