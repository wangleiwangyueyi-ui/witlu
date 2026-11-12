import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App';
const GlassLab = lazy(() => import('./lab/GlassLab'));
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={null}>{location.pathname === '/lab/glass' ? <GlassLab/> : <App/>}</Suspense></StrictMode>);
