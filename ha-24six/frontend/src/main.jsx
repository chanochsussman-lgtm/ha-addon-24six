import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Detect HA ingress path
const ingressMatch = window.location.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/)
window.ingressPath = ingressMatch ? ingressMatch[1] : ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={window.ingressPath || '/'}>
    <App />
  </BrowserRouter>
)
