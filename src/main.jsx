import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Ensure SW is registered immediately on load so tests can run without opening Messenger tab
if ('serviceWorker' in navigator) {
  // same path used by connectMessenger default
  navigator.serviceWorker.register('/worker/sw.js', { type: 'module' }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 