import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Detect HA ingress path
const match = window.location.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/);
window.ingressPath = match ? match[1] : '';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
