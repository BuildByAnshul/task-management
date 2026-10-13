import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation } from '@tanstack/react-query'
import { X, Copy, Check, Mail, UserPlus } from 'lucide-react'
import { closeInviteModal } from '../../store/uiSlice'
import { selectMembers } from '../../store/boardSlice'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import Avatar from '../ui/Avatar'

const ROLES = ['member', 'admin', 'viewer']

export default function InviteModal({ boardId }) {
  const dispatch = useDispatch()
  const members = useSelector(selectMembers)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/boards/${boardId}/invite`, { email, role })
      return data.data
    },
    onSuccess: (data) => {
      setInviteLink(data.inviteLink)
      toast.success(`Invite sent to ${email}`)
    },
    onError: () => toast.error('Failed to send invite'),
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied!')
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeInviteModal())}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UserPlus size={20} className="text-brand-teal" /> Invite People
            </h2>
            <button onClick={() => dispatch(closeInviteModal())}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Invite form */}
          <div className="space-y-3 mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pill-input pl-9 w-full text-sm"
                />
              </div>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="pill-input text-sm py-2"
              >
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <button
              onClick={() => email && inviteMutation.mutate()}
              disabled={!email || inviteMutation.isPending}
              className="btn-primary w-full text-sm disabled:opacity-50"
            >
              {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
            </button>
          </div>

          {/* Invite link */}
          {inviteLink && (
            <div className="mb-6 p-3 bg-teal-50 rounded-2xl">
              <p className="text-xs font-semibold text-teal-700 mb-2">Invite Link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 text-xs bg-white border border-teal-200 rounded-xl px-3 py-2"
                />
                <button onClick={handleCopy} className="btn-secondary text-xs flex items-center gap-1">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          )}

          {/* Current members */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Board Members ({members.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {members.map(({ user, role: memberRole }) => (
                <div key={user?._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                  <Avatar user={user} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <span className={`chip text-[10px] ${
                    memberRole === 'owner' ? 'bg-teal-100 text-teal-700'
                    : memberRole === 'admin' ? 'bg-blue-100 text-blue-700'
                    : memberRole === 'viewer' ? 'bg-gray-100 text-gray-600'
                    : 'bg-purple-100 text-purple-700'
                  }`}>
                    {memberRole}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
