import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Pill } from './Pill'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Pill />
    </StrictMode>
  )
}
