import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ignora erros inofensivos de ambiente para não aparecerem na tela
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || event.reason;
  if (typeof msg === 'string' && (
    msg.includes('WebSocket closed without opened') ||
    msg.includes('was released because another request stole it')
  )) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
