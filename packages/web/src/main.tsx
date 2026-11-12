import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App';
const GlassLab = lazy(() => import('./lab/GlassLab'));
const TerrainLab = lazy(() => import('./lab/TerrainLab'));
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={null}>{location.pathname === '/lab/glass' ? <GlassLab/> : location.pathname === '/lab/terrain' ? <TerrainLab/> : <App/>}</Suspense></StrictMode>);
