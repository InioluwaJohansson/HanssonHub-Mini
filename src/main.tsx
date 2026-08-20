import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LogsProvider } from './context/LogsContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { registerServiceWorker } from './utils/pwa.ts';

// Register Service Worker for PWA capabilities
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <LogsProvider>
        <App />
      </LogsProvider>
    </DataProvider>
  </StrictMode>,
);
