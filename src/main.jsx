import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getDecentClient } from 'decent_app_sdk';

// SW is registered by the DecentClient singleton on first use
// Proactively instantiate the singleton at startup to register the SW immediately
// Use an absolute path so Vite does not inline it as a data URL
getDecentClient({ serviceWorkerUrl: '/public/worker/sw.js' });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
