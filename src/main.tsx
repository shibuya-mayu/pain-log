import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { DataProvider } from './lib/data.tsx'
import { requestPersist } from './lib/db.ts'
import './index.css'

registerSW({ immediate: true })
void requestPersist()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
)
