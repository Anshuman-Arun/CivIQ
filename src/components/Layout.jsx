import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  Calendar, 
  FileText, 
  Users, 
  User, 
  LogIn, 
  LogOut,
  Landmark
} from 'lucide-react'

const Layout = ({ children }) => {
  const { user, signIn, signOut } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Officials', href: '/officials', icon: Users },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-civic-500/30 selection:text-civic-200 relative overflow-hidden">
      {/* Background Animated Floating Blobs for Visual depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-civic-900/15 blur-[130px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[65%] h-[65%] rounded-full bg-indigo-900/15 blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[35%] right-[15%] w-[45%] h-[45%] rounded-full bg-purple-900/10 blur-[130px] pointer-events-none"></div>


      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/60 backdrop-blur-md border-b border-gray-800/40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Left: Logo & Branding */}
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="flex items-center group">
                <Landmark className="h-8.5 w-8.5 text-civic-400 mr-3 transition-transform group-hover:scale-105 filter drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]" />
                <span className="text-2xl font-extrabold tracking-wide text-gray-100 transition-colors group-hover:text-civic-400">
                  CivIQ
                </span>
              </Link>
            </div>
            
            {/* Center: Centered Capsule Navigation Tabs */}
            <div className="hidden md:flex flex-grow justify-center px-4">
              <nav className="flex items-center space-x-1.5 bg-gray-950/60 p-1.5 rounded-full border border-gray-800/40">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-6 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all duration-200 ${
                        active
                          ? 'text-civic-400 bg-civic-950/80 shadow-[0_2px_10px_rgba(12,74,110,0.4)] border border-civic-900/30'
                          : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right: Auth Controls */}
            <div className="flex items-center flex-shrink-0 space-x-4">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className={`flex items-center px-6 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all duration-200 ${
                      isActive('/profile')
                        ? 'text-civic-400 bg-civic-950/80 border border-civic-900/30'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                    }`}
                  >
                    <User className="h-4.5 w-4.5 mr-2" />
                    Profile
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex items-center px-6 py-2.5 rounded-full text-sm font-bold tracking-wide text-gray-400 hover:text-gray-100 hover:bg-gray-800/50 border border-transparent transition-all duration-200"
                  >
                    <LogOut className="h-4.5 w-4.5 mr-2" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={signIn}
                  className="flex items-center px-6 py-2.5 rounded-full text-sm font-bold tracking-wide bg-gradient-to-r from-civic-600 to-blue-600 hover:from-civic-500 hover:to-blue-500 text-white shadow-[0_4px_12px_rgba(2,132,199,0.3)] hover:shadow-[0_4px_20px_rgba(2,132,199,0.5)] transition-all duration-200"
                >
                  <LogIn className="h-4.5 w-4.5 mr-2" />
                  Sign In
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-civic-400 bg-civic-900/40'
                    : 'text-gray-300 hover:text-gray-100 hover:bg-gray-800/40'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {children}
      </main>
    </div>
  )
}

export default Layout
