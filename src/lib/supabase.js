import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Determine if Supabase is properly configured and reachable
let realSupabase = null
let useMock = true

try {
  if (supabaseUrl && supabaseAnonKey && 
      !supabaseUrl.includes('your-project-ref') && 
      !supabaseUrl.includes('swzqqcvmdecrnpcvnknu')) {
    realSupabase = createClient(supabaseUrl, supabaseAnonKey)
    useMock = false
    console.log('Supabase client initialized successfully.')
  } else {
    console.warn('Supabase URL not configured or points to the broken default. Falling back to local mock database.')
  }
} catch (e) {
  console.error('Failed to initialize Supabase. Using local mock database fallback.', e)
}

// Mock Auth system
const authCallbacks = []
const mockAuth = {
  onAuthStateChange: (callback) => {
    authCallbacks.push(callback)
    const userJson = localStorage.getItem('civiq_mock_user')
    const user = userJson ? JSON.parse(userJson) : null
    
    setTimeout(() => {
      callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null)
    }, 0)
    
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = authCallbacks.indexOf(callback)
            if (index > -1) authCallbacks.splice(index, 1)
          }
        }
      }
    }
  },
  getUser: async () => {
    const userJson = localStorage.getItem('civiq_mock_user')
    return { data: { user: userJson ? JSON.parse(userJson) : null } }
  },
  signInWithOAuth: async () => {
    const mockUser = {
      id: 'mock-user-uuid-1234-5678',
      email: 'guest@civiq.local',
      user_metadata: { full_name: 'Guest User' },
      created_at: new Date().toISOString()
    }
    localStorage.setItem('civiq_mock_user', JSON.stringify(mockUser))
    authCallbacks.forEach(cb => cb('SIGNED_IN', { user: mockUser }))
    
    // In local mode, redirect to profile page
    setTimeout(() => {
      window.location.href = `${window.location.origin}/profile`
    }, 100)
    
    return { data: { provider: 'google', url: '#' }, error: null }
  },
  signOut: async () => {
    localStorage.removeItem('civiq_mock_user')
    authCallbacks.forEach(cb => cb('SIGNED_OUT', null))
    return { error: null }
  }
}

// Mock Storage system
const mockStorage = {
  from: (bucket) => ({
    upload: async (path, file) => {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
      localStorage.setItem(`civiq_file_${path}`, JSON.stringify(fileData))
      if (!window.civiq_mock_files) window.civiq_mock_files = {}
      window.civiq_mock_files[path] = file
      
      return { data: { path }, error: null }
    },
    getPublicUrl: (path) => {
      const file = window.civiq_mock_files?.[path]
      const url = file ? URL.createObjectURL(file) : `https://example.com/${path}`
      return { data: { publicUrl: url } }
    },
    remove: async (paths) => {
      paths.forEach(p => {
        localStorage.removeItem(`civiq_file_${p}`)
        if (window.civiq_mock_files) delete window.civiq_mock_files[p]
      })
      return { data: paths, error: null }
    }
  })
}

// Mock Database from() interface
const mockFrom = (table) => {
  return {
    select: (columns) => {
      let data = JSON.parse(localStorage.getItem(`civiq_table_${table}`) || '[]')
      
      // Handle relations (e.g. documents -> document_summaries)
      if (table === 'documents' && columns && columns.includes('document_summaries')) {
        const summaries = JSON.parse(localStorage.getItem('civiq_table_document_summaries') || '[]')
        data = data.map(doc => {
          const docSums = summaries.filter(s => s.document_id === doc.id)
          return {
            ...doc,
            document_summaries: docSums
          }
        })
      }
      
      const chain = {
        eq: (field, value) => {
          data = data.filter(item => {
            if (field === 'event_data->>id') {
              return item.event_data?.id === value
            }
            return item[field] === value
          })
          return chain
        },
        filter: (field, op, value) => {
          data = data.filter(item => {
            if (field === 'event_data->>id' && op === 'eq') {
              return item.event_data?.id === value
            }
            return item[field] === value
          })
          return chain
        },
        order: (field, options) => {
          data.sort((a, b) => {
            const valA = a[field]
            const valB = b[field]
            if (valA < valB) return options?.ascending ? -1 : 1
            if (valA > valB) return options?.ascending ? 1 : -1
            return 0
          })
          return chain
        },
        limit: (n) => {
          data = data.slice(0, n)
          return chain
        },
        then: (onfulfilled) => {
          return Promise.resolve(onfulfilled({ data, error: null }))
        }
      }
      return chain
    },
    insert: (records) => {
      let data = JSON.parse(localStorage.getItem(`civiq_table_${table}`) || '[]')
      const newRecords = Array.isArray(records) ? records : [records]
      const inserted = newRecords.map(r => {
        const withId = {
          id: r.id || `mock-uuid-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          ...r
        }
        data.push(withId)
        return withId
      })
      localStorage.setItem(`civiq_table_${table}`, JSON.stringify(data))
      
      const chain = {
        select: () => ({
          single: () => ({
            then: (onfulfilled) => Promise.resolve(onfulfilled({ data: inserted[0], error: null }))
          }),
          then: (onfulfilled) => Promise.resolve(onfulfilled({ data: inserted, error: null }))
        }),
        then: (onfulfilled) => Promise.resolve(onfulfilled({ data: inserted, error: null }))
      }
      return chain
    },
    delete: () => {
      let data = JSON.parse(localStorage.getItem(`civiq_table_${table}`) || '[]')
      let itemsToDelete = [...data]
      
      const chain = {
        eq: (field, value) => {
          itemsToDelete = itemsToDelete.filter(item => item[field] === value)
          data = data.filter(item => !itemsToDelete.includes(item))
          localStorage.setItem(`civiq_table_${table}`, JSON.stringify(data))
          return chain
        },
        filter: (field, op, value) => {
          if (field === 'event_data->>id' && op === 'eq') {
            itemsToDelete = itemsToDelete.filter(item => item.event_data?.id === value)
          } else {
            itemsToDelete = itemsToDelete.filter(item => item[field] === value)
          }
          data = data.filter(item => !itemsToDelete.includes(item))
          localStorage.setItem(`civiq_table_${table}`, JSON.stringify(data))
          return chain
        },
        then: (onfulfilled) => {
          return Promise.resolve(onfulfilled({ error: null }))
        }
      }
      return chain
    }
  }
}

// Exported wrapped Supabase client
export const supabase = {
  auth: new Proxy({}, {
    get: (target, prop) => {
      if (useMock) return mockAuth[prop]
      return realSupabase.auth[prop]
    }
  }),
  storage: new Proxy({}, {
    get: (target, prop) => {
      if (useMock) return mockStorage[prop]
      return realSupabase.storage[prop]
    }
  }),
  from: (table) => {
    if (useMock) return mockFrom(table)
    return realSupabase.from(table)
  }
}

// Database schema helpers
export const TABLES = {
  USERS: 'users',
  SAVED_EVENTS: 'saved_events',
  DOCUMENTS: 'documents',
  DOCUMENT_SUMMARIES: 'document_summaries'
}

// Auth helpers
export const signInWithGoogle = async () => {
  if (useMock) {
    return mockAuth.signInWithOAuth()
  }
  const { data, error } = await realSupabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/profile`
    }
  })
  return { data, error }
}

export const signOut = async () => {
  if (useMock) {
    return mockAuth.signOut()
  }
  const { error } = await realSupabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  if (useMock) {
    const { data: { user } } = await mockAuth.getUser()
    return user
  }
  const { data: { user } } = await realSupabase.auth.getUser()
  return user
}
