import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './index.css'
import App, { ErrorBoundary } from './App.jsx'
import { initSentry } from './sentry.js'
import { initAnalytics } from './utils/analytics.js'

initSentry()
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
