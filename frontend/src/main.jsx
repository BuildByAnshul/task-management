import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { store } from './store/index.js'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { style: { background: '#0F9488', color: '#fff' } },
            error: { style: { background: '#EF4444', color: '#fff' } },
          }}
        />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
)
