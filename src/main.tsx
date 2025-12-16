import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Możesz odkomentować tę linię, jeśli masz globalny plik CSS
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
