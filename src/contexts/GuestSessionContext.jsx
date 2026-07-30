import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

const GuestSessionContext = createContext(null)
const SESSION_KEY = 'civiq_guest_session'

const createId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const readGuestSession = () => {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export const GuestSessionProvider = ({ children }) => {
  const [guest, setGuest] = useState(readGuestSession)
  const [savedEvents, setSavedEvents] = useState([])
  const [documents, setDocuments] = useState([])
  const objectUrls = useRef(new Set())

  const signInGuest = useCallback(() => {
    const session = {
      id: createId(),
      displayName: 'Guest',
      startedAt: new Date().toISOString(),
    }

    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setGuest(session)
    return session
  }, [])

  const clearDocuments = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrls.current.clear()
    setDocuments([])
  }, [])

  const signOut = useCallback(() => {
    window.sessionStorage.removeItem(SESSION_KEY)
    setGuest(null)
    setSavedEvents([])
    clearDocuments()
  }, [clearDocuments])

  const toggleSavedEvent = useCallback((event) => {
    setSavedEvents((current) => {
      const isSaved = current.some((saved) => saved.id === event.id)
      return isSaved
        ? current.filter((saved) => saved.id !== event.id)
        : [{ ...event, savedAt: new Date().toISOString() }, ...current]
    })
  }, [])

  const addDocument = useCallback((document) => {
    if (document.objectUrl) objectUrls.current.add(document.objectUrl)
    setDocuments((current) => [document, ...current])
  }, [])

  const removeDocument = useCallback((documentId) => {
    setDocuments((current) => {
      const document = current.find((item) => item.id === documentId)
      if (document?.objectUrl) {
        URL.revokeObjectURL(document.objectUrl)
        objectUrls.current.delete(document.objectUrl)
      }
      return current.filter((item) => item.id !== documentId)
    })
  }, [])

  const value = useMemo(
    () => ({
      guest,
      isGuest: Boolean(guest),
      savedEvents,
      documents,
      signInGuest,
      signOut,
      toggleSavedEvent,
      addDocument,
      removeDocument,
      clearDocuments,
    }),
    [
      addDocument,
      clearDocuments,
      documents,
      guest,
      removeDocument,
      savedEvents,
      signInGuest,
      signOut,
      toggleSavedEvent,
    ],
  )

  return (
    <GuestSessionContext.Provider value={value}>
      {children}
    </GuestSessionContext.Provider>
  )
}

export const useGuestSession = () => {
  const context = useContext(GuestSessionContext)
  if (!context) {
    throw new Error('useGuestSession must be used within GuestSessionProvider')
  }
  return context
}
