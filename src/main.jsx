import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getReadyDecentClient} from 'decent_app_sdk';
import './styles.css';

// SW is registered by the DecentClient singleton on first use
// Proactively instantiate the singleton at startup to register the SW immediately
// Use an absolute path so Vite does not inline it as a data URL
const isDev = import.meta && import.meta.env && import.meta.env.DEV;
const base = (import.meta?.env?.BASE_URL ?? '/');
const swUrl = isDev ? `${base}src/sw.js` : `${base}sw.js`;
(async () => {
  try {
    const sdk = await getReadyDecentClient({ serviceWorkerUrl: swUrl });
    // Ensure our own DID inbox is registered with the router once SW is ready
    try {
      const { did } = await sdk.getDID();
      if (did) {
        try { await sdk.registerAddressOk(did); } catch {}
      }
    } catch (err) {
      console.warn('Failed to obtain DID or register address', err);
    }
    await sdk.protocols.refresh();
  } catch (err) {
    console.error('Failed to initialize Decent SDK or refresh protocols', err);
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
