import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const parts = window.location.pathname.split('/')
const idx = parts.indexOf('hassio_ingress')
window.ingressPath = idx !== -1 ? '/' + parts.slice(1, idx + 2).join('/') : ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={window.ingressPath || '/'}>
    <App />
  </BrowserRouter>
)
