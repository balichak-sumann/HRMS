import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import './index.css'
import App from './App.jsx'

const IST_TIMEZONE = 'Asia/Kolkata'

const patchDateLocaleToIST = () => {
  if (Date.prototype.__istPatched) return

  const originalDateString = Date.prototype.toLocaleDateString
  const originalTimeString = Date.prototype.toLocaleTimeString
  const originalDateTimeString = Date.prototype.toLocaleString

  Date.prototype.toLocaleDateString = function (locales, options) {
    return originalDateString.call(this, locales || 'en-IN', {
      ...(options || {}),
      timeZone: options?.timeZone || IST_TIMEZONE,
    })
  }

  Date.prototype.toLocaleTimeString = function (locales, options) {
    return originalTimeString.call(this, locales || 'en-IN', {
      ...(options || {}),
      timeZone: options?.timeZone || IST_TIMEZONE,
    })
  }

  Date.prototype.toLocaleString = function (locales, options) {
    return originalDateTimeString.call(this, locales || 'en-IN', {
      ...(options || {}),
      timeZone: options?.timeZone || IST_TIMEZONE,
    })
  }

  Object.defineProperty(Date.prototype, '__istPatched', {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  })
}

patchDateLocaleToIST()

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
