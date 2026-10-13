import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '../store/authSlice'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Zap, Loader } from 'lucide-react'

export default function InviteAcceptPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const isAuthenticated = useSelector(selectIsAuthenticated)

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/boards/invites/${token}/accept`)
      return data.data
    },
    onSuccess: ({ board }) => {
      toast.success('You joined the board!')
      navigate(`/boards/${board._id}`)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Invite invalid or expired')
      navigate('/')
    },
  })

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('pendingInvite', token)
      navigate('/login')
      return
    }
    acceptMutation.mutate()
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-teal rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Zap size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Joining board…</h2>
        <Loader size={24} className="text-brand-teal mx-auto animate-spin" />
      </div>
    </div>
  )
}
