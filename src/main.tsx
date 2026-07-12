import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LogsProvider } from './context/LogsContext.tsx';
import { DataProvider } from './context/DataContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <LogsProvider>
        <App />
      </LogsProvider>
    </DataProvider>
  </StrictMode>,
);
