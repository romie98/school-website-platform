import { Component, type ErrorInfo, type ReactNode } from 'react'
import { API_BASE_URL } from '@/config/api'
import { currentSessionUser, getToken } from '@/services/api'

async function reportFrontendError(error: Error, info?: ErrorInfo) {
  if (!getToken()) return
  try {
    await fetch(`${API_BASE_URL}/api/ops/client-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        message: error.message || 'Unhandled interface error',
        route: window.location.pathname,
        extra: { component: info?.componentStack?.slice(0, 500) },
      }),
    })
  } catch {
    /* never block the UI on monitoring */
  }
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportFrontendError(error, info)
  }

  render() {
    if (this.state.hasError) {
      const user = currentSessionUser()
      const home = user?.role === 'super_admin' ? '/platform' : user ? '/admin' : '/'
      return (
        <div className="flex min-h-svh items-center justify-center bg-cream px-4">
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">Something went wrong</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-brand">This page could not be displayed</h1>
            <p className="mt-3 text-sm text-muted">Please try again shortly. If the problem continues, contact the platform owner.</p>
            <a href={home} className="mt-6 inline-block rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark">
              Return
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function RouteErrorPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">Something went wrong</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-brand">This page could not be displayed</h1>
        <p className="mt-3 text-sm text-muted">Please try again shortly.</p>
        <a href="/" className="mt-6 inline-block rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark">
          Back to home
        </a>
      </div>
    </div>
  )
}
