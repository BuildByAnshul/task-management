import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useMutation } from '@tanstack/react-query'
import { Zap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { setCredentials } from '../store/authSlice'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)

  const registerMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/register', form)
      return data.data
    },
    onSuccess: ({ user, accessToken }) => {
      dispatch(setCredentials({ user, accessToken }))
      navigate('/')
      toast.success(`Welcome to NovaBoard, ${user.name.split(' ')[0]}!`)
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Registration failed'
      toast.error(msg)
    },
  })

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-panel rounded-3xl sm:rounded-4xl shadow-panel p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-brand-teal rounded-2xl flex items-center justify-center shadow-lg">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NovaBoard</h1>
            <p className="text-sm text-gray-500">Real-time collaborative Kanban</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
        <p className="text-sm text-gray-500 mb-6">Join your team on NovaBoard</p>

        <form onSubmit={(e) => { e.preventDefault(); registerMutation.mutate() }} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" required placeholder="John Doe" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="pill-input pl-10 w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" required placeholder="you@example.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="pill-input pl-10 w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showPw ? 'text' : 'password'} required placeholder="Min. 6 characters" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="pill-input pl-10 pr-10 w-full" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={registerMutation.isPending}
            className="btn-primary w-full py-3 text-base disabled:opacity-60">
            {registerMutation.isPending ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-teal font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
