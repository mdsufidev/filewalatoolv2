import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root')!;

// Mount cleanly with createRoot to ensure seamless client transition on prerendered SSG pages
// and avoid React 19 lazy hydration mismatch crashes on static tool routes
createRoot(rootElement).render(<App />);


