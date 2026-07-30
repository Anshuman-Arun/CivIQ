import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  LogOut,
  Trash2,
  User,
} from 'lucide-react'
import { useGuestSession } from '../contexts/GuestSessionContext'

const Profile = () => {
  const {
    guest,
    savedEvents,
    documents,
    signInGuest,
    signOut,
    toggleSavedEvent,
    removeDocument,
  } = useGuestSession()
  const [activeTab, setActiveTab] = useState('events')

  if (!guest) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-800 bg-gray-900/40 p-10 text-center">
        <User className="mx-auto mb-4 h-14 w-14 text-gray-500" />
        <h1 className="text-2xl font-extrabold text-gray-100">
          No guest session is active
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Start a temporary session to save events and document summaries while
          this tab remains open.
        </p>
        <button className="btn-primary mt-6" onClick={signInGuest} type="button">
          Sign In as Guest
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-full border border-civic-800/50 bg-civic-950/50 p-3">
              <User className="h-7 w-7 text-civic-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-100">
                Guest session
              </h1>
              <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5 text-civic-400" />
                Started {new Date(guest.startedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            className="btn-secondary flex items-center justify-center gap-2"
            onClick={signOut}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            End session and clear data
          </button>
        </div>
        <p className="mt-5 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100">
          Saved events and documents are held only in browser memory. Ending the
          session, closing the tab, or reloading the app clears them.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 text-center">
          <Calendar className="mx-auto h-7 w-7 text-civic-400" />
          <p className="mt-2 text-3xl font-extrabold text-gray-100">
            {savedEvents.length}
          </p>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Session events
          </p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 text-center">
          <FileText className="mx-auto h-7 w-7 text-civic-400" />
          <p className="mt-2 text-3xl font-extrabold text-gray-100">
            {documents.length}
          </p>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Session summaries
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40">
        <div className="flex border-b border-gray-800">
          <button
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wide ${
              activeTab === 'events'
                ? 'border-b-2 border-civic-400 text-civic-300'
                : 'text-gray-400'
            }`}
            onClick={() => setActiveTab('events')}
            type="button"
          >
            <Bookmark className="h-4 w-4" />
            Events
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wide ${
              activeTab === 'documents'
                ? 'border-b-2 border-civic-400 text-civic-300'
                : 'text-gray-400'
            }`}
            onClick={() => setActiveTab('documents')}
            type="button"
          >
            <FileText className="h-4 w-4" />
            Documents
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'events' &&
            (savedEvents.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No events saved.{' '}
                <Link className="text-civic-400 hover:text-civic-300" to="/events">
                  Browse sourced meetings
                </Link>
                .
              </div>
            ) : (
              <div className="space-y-3">
                {savedEvents.map((event) => (
                  <article
                    className="flex items-start justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/30 p-4"
                    key={event.id}
                  >
                    <div>
                      <h2 className="font-bold text-gray-100">{event.title}</h2>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(event.startDate).toLocaleString()} · {event.sourceName}
                      </p>
                    </div>
                    <button
                      aria-label={`Remove ${event.title}`}
                      className="rounded-full p-2 text-gray-500 hover:bg-red-950/40 hover:text-red-300"
                      onClick={() => toggleSavedEvent(event)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </article>
                ))}
              </div>
            ))}

          {activeTab === 'documents' &&
            (documents.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No documents analyzed.{' '}
                <Link className="text-civic-400 hover:text-civic-300" to="/documents">
                  Analyze a document
                </Link>
                .
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => (
                  <article
                    className="flex items-start justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/30 p-4"
                    key={document.id}
                  >
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-gray-100">
                        {document.filename}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                        {document.analysis.overview}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <a
                        aria-label={`Open ${document.filename}`}
                        className="rounded-full p-2 text-gray-500 hover:text-civic-300"
                        href={document.objectUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        aria-label={`Remove ${document.filename}`}
                        className="rounded-full p-2 text-gray-500 hover:bg-red-950/40 hover:text-red-300"
                        onClick={() => removeDocument(document.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}

export default Profile
