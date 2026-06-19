import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Calendar, 
  FileText, 
  Users, 
  MapPin, 
  ArrowRight,
  Shield,
  Eye,
  Users2
} from 'lucide-react'

// Coded visual representing the Civic Data Hub Node system
const CivIQHubVisual = () => {
  return (
    <div className="w-full max-w-lg relative select-none">
      {/* Glowing background halo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-civic-500/10 to-indigo-500/10 rounded-full blur-3xl opacity-75"></div>
      
      <svg
        viewBox="0 0 400 480"
        className="w-full h-auto drop-shadow-[0_4px_25px_rgba(0,0,0,0.6)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow Filters */}
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Orbit Rings (Outer is solid, inner is a faint detail ring) */}
        <circle cx="200" cy="250" r="120" stroke="#374151" strokeWidth="1.5" />
        <circle cx="200" cy="250" r="110" stroke="#1f2937" strokeWidth="1" strokeDasharray="3, 5" strokeOpacity="0.5" />

        {/* Spinning Group: Contains both connection lines and node groups */}
        <g className="orbit-spinner">
          
          {/* Dynamic Connection Lines with Flowing Dots */}
          {/* Connection 1: Center to Meetings (Top) */}
          <path d="M200 250 L200 130" stroke="#a855f7" strokeWidth="2" strokeOpacity="0.4" />
          <path d="M200 250 L200 130" stroke="#a855f7" strokeWidth="2.5" className="flow-line" strokeLinecap="round" />

          {/* Connection 2: Center to Documents (Bottom-Right) */}
          <path d="M200 250 L304 310" stroke="#10b981" strokeWidth="2" strokeOpacity="0.4" />
          <path d="M200 250 L304 310" stroke="#10b981" strokeWidth="2.5" className="flow-line" strokeLinecap="round" />

          {/* Connection 3: Center to Officials (Bottom-Left) */}
          <path d="M200 250 L96 310" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.4" />
          <path d="M200 250 L96 310" stroke="#3b82f6" strokeWidth="2.5" className="flow-line" strokeLinecap="round" />

          {/* Node 1: Meetings (Top) - Counter-rotated so text remains upright */}
          <g className="node-meetings">
            <g className="hover-3d">
              <circle cx="200" cy="130" r="28" fill="#581c87" fillOpacity="0.4" stroke="#a855f7" strokeWidth="1.5" filter="url(#glow-purple)" />
              <circle cx="200" cy="130" r="22" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              
              {/* Calendar Icon */}
              <g transform="translate(190, 120) scale(0.85)">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#a855f7" strokeWidth="2" />
                <line x1="16" y1="2" x2="16" y2="6" stroke="#a855f7" strokeWidth="2" />
                <line x1="8" y1="2" x2="8" y2="6" stroke="#a855f7" strokeWidth="2" />
                <line x1="3" y1="10" x2="21" y2="10" stroke="#a855f7" strokeWidth="2" />
              </g>
              {/* Captions positioned on the outside of the orbiting radius */}
              <text x="200" y="88" textAnchor="middle" fill="#e9d5ff" fontSize="10" fontWeight="bold" fontFamily="Outfit, sans-serif" letterSpacing="0.05em">MEETINGS</text>
            </g>
          </g>

          {/* Node 2: Documents (Bottom-Right) - Counter-rotated */}
          <g className="node-documents">
            <g className="hover-3d">
              <circle cx="304" cy="310" r="28" fill="#064e3b" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5" filter="url(#glow-green)" />
              <circle cx="304" cy="310" r="22" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
              
              {/* Document Icon */}
              <g transform="translate(294, 300) scale(0.85)">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#10b981" strokeWidth="2" />
                <path d="M14 2v6h6" stroke="#10b981" strokeWidth="2" />
                <line x1="16" y1="13" x2="8" y2="13" stroke="#10b981" strokeWidth="1.5" />
                <line x1="16" y1="17" x2="8" y2="17" stroke="#10b981" strokeWidth="1.5" />
              </g>
              {/* Captions positioned on the outside of the orbiting radius */}
              <text x="304" y="368" textAnchor="middle" fill="#d1fae5" fontSize="10" fontWeight="bold" fontFamily="Outfit, sans-serif" letterSpacing="0.05em">DOCUMENTS</text>
            </g>
          </g>

          {/* Node 3: Officials (Bottom-Left) - Counter-rotated */}
          <g className="node-officials">
            <g className="hover-3d">
              <circle cx="96" cy="310" r="28" fill="#1e3a8a" fillOpacity="0.4" stroke="#3b82f6" strokeWidth="1.5" filter="url(#glow-cyan)" />
              <circle cx="96" cy="310" r="22" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
              
              {/* Users Icon */}
              <g transform="translate(86, 300) scale(0.85)">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="9" cy="7" r="4" stroke="#3b82f6" strokeWidth="2" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="#3b82f6" strokeWidth="2" />
                <path d="M16 3.13a4 4 0 010 7.75" stroke="#3b82f6" strokeWidth="2" />
              </g>
              {/* Captions positioned on the outside of the orbiting radius */}
              <text x="96" y="368" textAnchor="middle" fill="#dbeafe" fontSize="10" fontWeight="bold" fontFamily="Outfit, sans-serif" letterSpacing="0.05em">OFFICIALS</text>
            </g>
          </g>
          
        </g>

        {/* Central Hub Node (CivIQ Core) - Stays static in the center */}
        <g className="hover-3d">
          {/* Outer glow rings */}
          <circle cx="200" cy="250" r="42" fill="#0c4a6e" fillOpacity="0.3" stroke="#0ea5e9" strokeWidth="1.5" strokeOpacity="0.6" filter="url(#glow-cyan)" />
          <circle cx="200" cy="250" r="34" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2.5" />
          
          {/* Capitol Building Icon */}
          <g transform="translate(186, 235) scale(1.15)">
            <path d="M3 18h18" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 18v-8M9 18v-8M13 18v-8M17 18v-8" stroke="#0ea5e9" strokeWidth="1.5" />
            <path d="M2 10h20" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 2L2 10h20L12 2z" fill="#0ea5e9" fillOpacity="0.2" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" />
          </g>
          {/* All central text labels have been removed */}
        </g>
      </svg>
    </div>
  )
}


const Home = () => {
  const { user } = useAuth()

  const features = [
    {
      name: 'Government Events',
      description: 'Discover nearby government meetings, city council sessions, and public hearings in your area.',
      icon: Calendar,
      href: '/events',
      color: 'bg-blue-600/10 text-blue-400 border border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]'
    },
    {
      name: 'Document Summaries',
      description: 'Upload government documents and get AI-powered summaries that make complex policies easy to understand.',
      icon: FileText,
      href: '/documents',
      color: 'bg-green-600/10 text-green-400 border border-green-500/20',
      hoverBorder: 'hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]'
    },
    {
      name: 'Local Officials',
      description: 'Find your representatives, learn about their positions, and see their recent legislative activity.',
      icon: Users,
      href: '/officials',
      color: 'bg-purple-600/10 text-purple-400 border border-purple-500/20',
      hoverBorder: 'hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
    }
  ]

  const benefits = [
    {
      icon: Shield,
      title: 'Transparent Government',
      description: 'Access public information and understand how decisions are made in your community.',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40 border border-emerald-900/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
    },
    {
      icon: Eye,
      title: 'Simplified Information',
      description: 'Complex government documents are summarized into easy-to-understand bullet points.',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40 border border-amber-900/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] group-hover:border-amber-500/50 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
    },
    {
      icon: Users2,
      title: 'Civic Engagement',
      description: 'Stay informed about local events and connect with your elected representatives.',
      colorClass: 'text-civic-400',
      bgClass: 'bg-civic-950/40 border border-civic-900/30 shadow-[0_0_15px_rgba(14,165,233,0.1)] group-hover:border-civic-500/50 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]'
    }
  ]

  return (
    <div className="space-y-16 pt-3 md:pt-6">
      {/* Split Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Title & Description */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <h1 className="text-5xl font-extrabold text-gray-100 sm:text-6xl md:text-7xl tracking-tight leading-tight">
            Your Gateway to
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-civic-400 via-blue-500 to-indigo-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.25)] py-2">
              Civic Engagement
            </span>
          </h1>
          <p className="max-w-2xl text-xl text-gray-300 leading-relaxed">
            Stay informed about local government, understand public policies, and connect with your representatives. CivIQ makes civic participation simple, interactive, and transparent.
          </p>
          {!user && (
            <div className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800/60 backdrop-blur-md inline-block">
              <p className="text-sm text-gray-400">
                Sign in to save events, track bills, and customize your CivIQ dashboard.
              </p>
            </div>
          )}
        </div>
        
        {/* Right Column: Labeled Animated Hub Visual */}
        <div className="lg:col-span-6 flex justify-center">
          <CivIQHubVisual />
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link
              key={feature.name}
              to={feature.href}
              className={`group relative bg-gray-900/40 p-6 rounded-2xl shadow-md border border-gray-800/60 hover:-translate-y-1.5 transition-all duration-300 backdrop-blur-md ${feature.hoverBorder}`}
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-xl ${feature.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-bold text-gray-100 group-hover:text-civic-400 transition-colors">
                    {feature.name}
                  </h3>
                  <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-civic-400 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-900/30 rounded-2xl shadow-md p-8 border border-gray-800/60 backdrop-blur-md">
        <h2 className="text-2xl font-extrabold text-gray-100 text-center mb-8">
          Why Civic Engagement Matters
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div key={index} className="text-center group">
                <div className={`mx-auto p-4 rounded-full w-fit mb-4 group-hover:scale-105 transition-all duration-300 ${benefit.bgClass}`}>
                  <Icon className={`h-6 w-6 ${benefit.colorClass}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-100 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-civic-900 to-indigo-950 rounded-2xl p-8 text-center text-white border border-civic-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-civic-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <MapPin className="h-12 w-12 mx-auto mb-4 text-civic-400" />
        <h2 className="text-2xl font-extrabold mb-3">
          Ready to Get Involved?
        </h2>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto text-sm leading-relaxed">
          Start exploring government events in your area, upload documents for AI-powered summaries, 
          or find your local representatives. Your voice matters in democracy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
          <Link
            to="/events"
            className="bg-white text-gray-950 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors shadow-md shadow-gray-950/20"
          >
            Find Local Events
          </Link>
          <Link
            to="/officials"
            className="border border-gray-700 bg-gray-900/40 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            Meet Your Representatives
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
