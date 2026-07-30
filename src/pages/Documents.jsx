import React, { useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ExternalLink,
  FileText,
  Loader,
  Trash2,
  Upload,
} from 'lucide-react'
import { useGuestSession } from '../contexts/GuestSessionContext'
import { summarizeDocument } from '../lib/api'

const MAX_FILE_BYTES = 2 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md']

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `document-${Date.now()}-${Math.random().toString(36).slice(2)}`

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.readAsDataURL(file)
  })

const prepareDocumentPayload = async (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'pdf') {
    return {
      filename: file.name,
      mimeType: 'application/pdf',
      contentBase64: await fileToBase64(file),
    }
  }

  if (extension === 'docx') {
    const { default: mammoth } = await import('mammoth')
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    })
    if (!result.value.trim()) {
      throw new Error('No readable text was found in this DOCX file.')
    }
    return {
      filename: file.name,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      text: result.value,
    }
  }

  const text = await file.text()
  if (!text.trim()) throw new Error('The selected file is empty.')
  return {
    filename: file.name,
    mimeType: file.type || 'text/plain',
    text,
  }
}

const AnalysisPanel = ({ analysis }) => (
  <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
    <section className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
        Citizen summary
      </h4>
      <p className="mt-3 text-sm leading-relaxed text-emerald-50">
        {analysis.overview}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-emerald-100">
        {analysis.keyPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>

    <section className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">
        Key terms
      </h4>
      {analysis.terms.length === 0 ? (
        <p className="mt-3 text-sm text-blue-100">
          No specialized terms were identified.
        </p>
      ) : (
        <dl className="mt-3 space-y-3 text-sm">
          {analysis.terms.map(({ term, definition }) => (
            <div key={term}>
              <dt className="font-bold text-blue-100">{term}</dt>
              <dd className="mt-0.5 text-blue-200">{definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>

    {(analysis.importantDates.length > 0 || analysis.citizenActions.length > 0) && (
      <section className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-4">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
          <Calendar className="h-3.5 w-3.5" />
          Dates and actions
        </h4>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-purple-100">
          {[...analysis.importantDates, ...analysis.citizenActions].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    )}

    <section className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        Verification notes
      </h4>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-100">
        {analysis.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  </div>
)

const Documents = () => {
  const {
    guest,
    documents,
    signInGuest,
    addDocument,
    removeDocument,
  } = useGuestSession()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')

  const analyzeFile = async (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError('Choose a PDF, DOCX, TXT, or Markdown file.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Files must be 2 MB or smaller for this stateless deployment.')
      return
    }

    setUploading(true)
    setError('')

    try {
      const payload = await prepareDocumentPayload(file)
      const response = await summarizeDocument(payload)
      addDocument({
        id: makeId(),
        filename: file.name,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        objectUrl: URL.createObjectURL(file),
        analysis: response.analysis,
        model: response.model,
      })
    } catch (analysisError) {
      setError(analysisError.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    if (event.dataTransfer.files?.[0]) analyzeFile(event.dataTransfer.files[0])
  }

  if (!guest) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-800 bg-gray-900/40 p-10 text-center">
        <FileText className="mx-auto mb-4 h-14 w-14 text-gray-500" />
        <h1 className="text-2xl font-extrabold text-gray-100">
          Start a guest session
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Documents and summaries remain only in this tab&apos;s memory. They
          are not uploaded to a CivIQ database or retained after the session.
        </p>
        <button className="btn-primary mt-6" onClick={signInGuest} type="button">
          Sign In as Guest
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragActive
            ? 'border-civic-400 bg-civic-950/20'
            : 'border-gray-800 bg-gray-900/40'
        }`}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-11 w-11 text-civic-400" />
        <h1 className="mt-4 text-xl font-extrabold text-gray-100">
          Analyze a public document
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
          PDF files are sent directly to the configured Gemini API for
          analysis. DOCX and text files are converted to plain text first.
          CivIQ does not retain the file or summary after this guest session.
        </p>
        <label className="btn-primary mt-5 inline-flex cursor-pointer items-center gap-2">
          <Upload className="h-4 w-4" />
          Choose file
          <input
            accept=".pdf,.docx,.txt,.md"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => event.target.files?.[0] && analyzeFile(event.target.files[0])}
            type="file"
          />
        </label>
        <p className="mt-3 text-xs text-gray-500">PDF, DOCX, TXT, or MD · 2 MB maximum</p>

        {uploading && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-civic-300" role="status">
            <Loader className="h-4 w-4 animate-spin" />
            Analyzing the document…
          </div>
        )}
        {error && (
          <p className="mt-5 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
      </section>

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-gray-800/50 bg-gray-900/20 py-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-600" />
          <p className="mt-3 text-sm text-gray-400">
            No documents have been analyzed in this session.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {documents.map((document) => (
            <article
              className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6"
              key={document.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-gray-100">
                    {document.filename}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {(document.fileSize / 1024 / 1024).toFixed(2)} MB ·{' '}
                    {new Date(document.createdAt).toLocaleString()} · {document.model}
                  </p>
                </div>
                <div className="flex gap-1">
                  <a
                    aria-label={`Open ${document.filename}`}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-civic-300"
                    href={document.objectUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    aria-label={`Remove ${document.filename}`}
                    className="rounded-full p-2 text-gray-400 hover:bg-red-950/40 hover:text-red-300"
                    onClick={() => removeDocument(document.id)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <AnalysisPanel analysis={document.analysis} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default Documents
