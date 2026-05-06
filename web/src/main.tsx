import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { ReactFlowProvider } from 'reactflow'

import App from '@/App'
import { ThemeProvider } from '@/components/theme-provider'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>
      <Analytics />
    </ThemeProvider>
  </StrictMode>,
)
