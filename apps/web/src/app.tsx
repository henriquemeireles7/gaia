import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import { ToastProvider } from './components'

export default function App() {
  return (
    <Router
      root={(props) => (
        <ToastProvider>
          <Suspense>{props.children}</Suspense>
        </ToastProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
