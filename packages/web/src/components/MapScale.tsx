import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import { terrainBridge } from '../state/terrain';

export function MapScale() {
  const ref = useRef<HTMLSpanElement>(null), {locale} = useI18n();
  useEffect(() => {
    const update = () => {
      const camera = terrainBridge.engine?.camera;
      if (!camera || !ref.current) return;
      const kmPerPixel = camera.metresPerPixel() * Math.cos(camera.pose.lat * Math.PI / 180) / 1000;
      const target = kmPerPixel * 102;
      const decade = 10 ** Math.floor(Math.log10(target));
      const km = ([5, 2, 1].find(n => n * decade <= target) ?? 1) * decade;
      ref.current.style.width = `${km / kmPerPixel}px`;
      ref.current.textContent = locale === 'en' ? `${km} km` : `${km} 公里`;
    };
    update();
    return terrainBridge.subscribe(update);
  }, [locale]);
  return <span className="map-scale" ref={ref} aria-label={locale==='en'?'Map scale':'比例尺'}/>;
}
