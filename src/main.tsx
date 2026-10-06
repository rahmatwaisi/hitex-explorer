import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { upgradeHashAddress } from './lib/router'

// old /#/… links and printed QR codes open their clean address
upgradeHashAddress()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
