import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { selectIsAuthenticated, selectAccessToken, selectUser } from './store/authSlice'
import { initSocket, disconnectSocket } from './lib/socket'
import api from './lib/api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import BoardPage from './pages/BoardPage'
import InviteAcceptPage from './pages/InviteAcceptPage'
import AppLayout from './components/layout/AppLayout'

function PrivateRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  return isAuthenticated ? <Navigate to="/" replace /> : children
}

function BoardsRedirect() {
  const navigate = useNavigate()
  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await api.get('/boards')
      return data.data.boards || []
    },
  })

  useEffect(() => {
    if (!isLoading) {
      const lastBoardId = localStorage.getItem('novaboard_last_board')
      const validLast = boards?.find(b => b._id === lastBoardId)
      const targetId = validLast?._id || boards?.[0]?._id
      if (targetId) {
        navigate(`/boards/${targetId}`, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [boards, isLoading, navigate])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 rounded-full border-2 border-brand-teal border-t-transparent" />
    </div>
  )
}

export default function App() {
  const accessToken = useSelector(selectAccessToken)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      initSocket(accessToken)
    } else {
      disconnectSocket()
    }
    return () => {}
  }, [isAuthenticated, accessToken])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="boards" element={<BoardsRedirect />} />
          <Route path="boards/:boardId" element={<BoardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
