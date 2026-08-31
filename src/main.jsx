import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string') {
    if (/The width\([-\d]+\) and height\([-\d]+\) of chart should be greater than/.test(args[0])) return;
    if (args[0].includes('Multiple GoTrueClient instances detected in the same browser context')) return;
  }
  originalWarn(...args);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
