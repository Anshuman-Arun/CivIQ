import React, { Component, Suspense, lazy } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { GuestSessionProvider } from './contexts/GuestSessionContext'
import Layout from './components/Layout'

const Home = lazy(() => import('./pages/Home'))
const Events = lazy(() => import('./pages/Events'))
const Documents = lazy(() => import('./pages/Documents'))
const Officials = lazy(() => import('./pages/Officials'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))

const RouteLoader = () => (
  <div className="flex min-h-64 items-center justify-center" role="status">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-civic-400" />
    <span className="sr-only">Loading page</span>
  </div>
)

class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 p-8 text-gray-100">
          <div className="mx-auto max-w-lg rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center">
            <h1 className="text-xl font-bold">CivIQ hit an unexpected error</h1>
            <p className="mt-2 text-sm text-gray-300">
              Reload the page to start a fresh guest session.
            </p>
            <button
              className="btn-primary mt-5"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload CivIQ
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <GuestSessionProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout>
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/officials" element={<Officials />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </GuestSessionProvider>
    </AppErrorBoundary>
  )
}

export default App
