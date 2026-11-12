export function Refraction() {
  return <svg className="filter-defs" aria-hidden="true"><defs><filter id="glass-refraction" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".008 .012" numOctaves="1" seed="7" result="noise"/><feGaussianBlur in="noise" stdDeviation="2" result="smooth"/><feDisplacementMap in="SourceGraphic" in2="smooth" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>;
}
export function supportsRefraction() {
  return /Chrome|Chromium|Edg\//.test(navigator.userAgent) && !/Firefox/.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'url("#glass-refraction") blur(1px)');
}
