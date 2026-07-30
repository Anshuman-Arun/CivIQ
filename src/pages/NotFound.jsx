import React from 'react'
import { Link } from 'react-router-dom'
import { Landmark } from 'lucide-react'

const NotFound = () => (
  <div className="mx-auto max-w-lg rounded-2xl border border-gray-800 bg-gray-900/40 p-10 text-center">
    <Landmark className="mx-auto mb-4 h-12 w-12 text-civic-400" />
    <h1 className="text-2xl font-extrabold text-gray-100">Page not found</h1>
    <p className="mt-2 text-sm text-gray-400">
      The CivIQ page you requested does not exist.
    </p>
    <Link className="btn-primary mt-6 inline-flex" to="/">
      Return home
    </Link>
  </div>
)

export default NotFound
