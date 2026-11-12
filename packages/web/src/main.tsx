import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App';
const GlassLab = lazy(() => import('./lab/GlassLab'));
const TerrainLab = lazy(() => import('./lab/TerrainLab'));
const EnvironmentLab = lazy(() => import('./lab/EnvironmentLab'));
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={null}>{location.pathname === '/lab/glass' ? <GlassLab/> : location.pathname === '/lab/terrain' ? <TerrainLab/> : location.pathname === '/lab/ocean' ? <EnvironmentLab mode="ocean"/> : location.pathname === '/lab/clouds' ? <EnvironmentLab mode="clouds"/> : <App/>}</Suspense></StrictMode>);
