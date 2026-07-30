import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const globals = Object.fromEntries(
  [
    'AbortController',
    'Buffer',
    'FileReader',
    'Headers',
    'Request',
    'Response',
    'URL',
    'clearTimeout',
    'console',
    'crypto',
    'document',
    'fetch',
    'globalThis',
    'navigator',
    'process',
    'setTimeout',
    'window',
  ].map((name) => [name, 'readonly']),
)

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals,
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
]
