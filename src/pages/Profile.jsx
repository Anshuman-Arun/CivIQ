import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, TABLES } from '../lib/supabase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { 
  User, 
  Calendar, 
  FileText, 
  Bookmark, 
  Trash2, 
  Download,
  Eye,
  Clock,
  Mail,
  MapPin
} from 'lucide-react'

const Profile = () => {
  const { user, signOut } = useAuth()
  const [savedEvents, setSavedEvents] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('events')

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchSavedEvents(),
        fetchDocuments()
      ])
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedEvents = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.SAVED_EVENTS)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setSavedEvents(data || [])
    } catch (error) {
      console.error('Error fetching saved events:', error)
    }
  }

  const fetchDocuments = async () => {
    try {
      if (!user || !user.id) {
        console.log('No user found, skipping document fetch')
        setDocuments([])
        return
      }
      
      const { data, error } = await supabase
        .from(TABLES.DOCUMENTS)
        .select('*, document_summaries(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const removeSavedEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from(TABLES.SAVED_EVENTS)
        .delete()
        .eq('user_id', user.id)
        .eq('id', eventId)
      
      if (error) throw error
      setSavedEvents(prev => prev.filter(event => event.id !== eventId))
    } catch (error) {
      console.error('Error removing saved event:', error)
    }
  }

  const deleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const document = documents.find(d => d.id === documentId)
      
      // Delete from storage
      if (document.file_path) {
        await supabase.storage
          .from('documents')
          .remove([document.file_path])
      }

      // Delete from database
      const { error } = await supabase
        .from(TABLES.DOCUMENTS)
        .delete()
        .eq('id', documentId)
      
      if (error) throw error
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-100 mb-4">
          Please sign in to view your profile
        </h2>
        <p className="text-gray-300">
          Sign in to access your saved events and uploaded documents.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-civic-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gray-900/40 rounded-2xl shadow-xl p-6 border border-gray-800/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="bg-civic-950/60 border border-civic-800/50 p-3.5 rounded-full mr-4 shadow-lg shadow-civic-950/40">
              <User className="h-8 w-8 text-civic-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-100">
                {user.user_metadata?.full_name || user.email}
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-civic-400" />
                Member since {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long'
                })}
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="px-5 py-2 text-xs font-bold text-gray-300 hover:text-white bg-gray-950/50 hover:bg-gray-900/80 border border-gray-800/80 hover:border-gray-700/80 rounded-full transition-all duration-200 shadow-inner"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900/40 rounded-2xl shadow-xl p-6 text-center border border-gray-800/80 backdrop-blur-md hover:border-civic-500/30 transition-all duration-300 group">
          <Calendar className="h-8 w-8 text-civic-400 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
          <div className="text-3xl font-extrabold text-gray-100">{savedEvents.length}</div>
          <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Saved Events</div>
        </div>
        <div className="bg-gray-900/40 rounded-2xl shadow-xl p-6 text-center border border-gray-800/80 backdrop-blur-md hover:border-civic-500/30 transition-all duration-300 group">
          <FileText className="h-8 w-8 text-civic-400 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
          <div className="text-3xl font-extrabold text-gray-100">{documents.length}</div>
          <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Uploaded Documents</div>
        </div>
        <div className="bg-gray-900/40 rounded-2xl shadow-xl p-6 text-center border border-gray-800/80 backdrop-blur-md hover:border-civic-500/30 transition-all duration-300 group">
          <Bookmark className="h-8 w-8 text-civic-400 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
          <div className="text-3xl font-extrabold text-gray-100">
            {documents.filter(doc => doc.document_summaries && doc.document_summaries.length > 0).length}
          </div>
          <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Summaries Generated</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-900/40 rounded-2xl shadow-xl border border-gray-800/80 backdrop-blur-md overflow-hidden">
        <div className="border-b border-gray-800/80 bg-gray-950/20 px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('events')}
              className={`py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center ${
                activeTab === 'events'
                  ? 'border-civic-400 text-civic-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Saved Events ({savedEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center ${
                activeTab === 'documents'
                  ? 'border-civic-400 text-civic-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Documents ({documents.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'events' && (
            <div className="space-y-4">
              {savedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-300 mb-2">No saved events</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    Events you save from the Events page will appear here.
                  </p>
                </div>
              ) : (
                savedEvents.map((savedEvent) => {
                  const event = savedEvent.event_data
                  return (
                    <div key={savedEvent.id} className="bg-gray-950/30 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700/80 transition-all duration-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg font-bold text-gray-100">
                            {event.title}
                          </h3>
                          <p className="text-gray-300 text-sm leading-relaxed">{event.description}</p>
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400 pt-1">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-civic-400" />
                              {formatDate(event.date)}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-civic-400" />
                              {event.location}
                            </div>
                            {event.agenda && (
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-civic-400" />
                                <span>{event.agenda}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeSavedEvent(savedEvent.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
                          title="Remove from saved"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-300 mb-2">No documents uploaded</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    Documents you upload from the Documents page will appear here.
                  </p>
                </div>
              ) : (
                documents.map((document) => (
                  <div key={document.id} className="bg-gray-950/30 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700/80 transition-all duration-200">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileText className="h-5 w-5 text-civic-400 shrink-0" />
                          <h3 className="text-base font-bold text-gray-100 truncate max-w-full">
                            {document.filename}
                          </h3>
                          <span className="bg-civic-950 text-civic-400 border border-civic-800/30 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            {formatFileSize(document.file_size)}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5 mr-1.5 text-civic-400" />
                          Uploaded {formatDate(document.created_at)}
                        </div>

                        {document.document_summaries && document.document_summaries.length > 0 ? (
                          <div className="bg-emerald-950/25 border border-emerald-500/20 rounded-xl p-4 mt-4 shadow-inner">
                            <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-wider mb-2">AI Summary</h4>
                            <div className="prose prose-invert max-w-none text-emerald-100 text-sm leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {document.document_summaries[0].summary_text}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-yellow-950/20 border border-yellow-500/10 rounded-xl p-3 mt-4 shadow-inner">
                            <p className="text-yellow-300 text-xs flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                              Summary processing...
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end md:self-start">
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-civic-400 hover:bg-civic-950/30 rounded-lg transition-all"
                          title="View document"
                        >
                          <Eye className="h-5 w-5" />
                        </a>
                        <a
                          href={document.file_url}
                          download={document.filename}
                          className="p-2 text-gray-500 hover:text-civic-400 hover:bg-civic-950/30 rounded-lg transition-all"
                          title="Download document"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => deleteDocument(document.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
                          title="Delete document"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
