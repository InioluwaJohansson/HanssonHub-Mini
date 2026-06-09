import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LogsProvider } from './context/LogsContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LogsProvider>
      <App />
    </LogsProvider>
  </StrictMode>,
);
