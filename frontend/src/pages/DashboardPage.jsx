import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Layout, Clock, Users, Zap } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import api from '../lib/api'
import { useSelector } from 'react-redux'
import { selectUser } from '../store/authSlice'
import Avatar from '../components/ui/Avatar'
import toast from 'react-hot-toast'

const statusColors = {
  planning: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-600',
}

function CreateBoardModal({ onClose }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', clientName: '', startDate: '', endDate: '' })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/boards', form)
      return data.data.board
    },
    onSuccess: (board) => {
      queryClient.invalidateQueries(['boards'])
      toast.success('Board created!')
      navigate(`/boards/${board._id}`)
    },
    onError: () => toast.error('Failed to create board'),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Board</h2>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
            <input required placeholder="Board title *" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="pill-input w-full" />
            <input placeholder="Client name" value={form.clientName}
              onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
              className="pill-input w-full" />
            <textarea placeholder="Description" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-teal/30" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Start Date</label>
                <input type="date" value={form.startDate}
                  onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  className="pill-input w-full text-sm py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">End Date</label>
                <input type="date" value={form.endDate}
                  onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className="pill-input w-full text-sm py-2" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating…' : 'Create Board'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await api.get('/boards')
      return data.data.boards
    },
  })

  const boards = data || []

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Good day, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here are your workspaces</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus size={18} /> New Board
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Layout, label: 'Total Boards', value: boards.length, color: 'text-teal-600 bg-teal-50' },
          { icon: Clock, label: 'In Progress', value: boards.filter(b => b.status === 'in_progress').length, color: 'text-orange-500 bg-orange-50' },
          { icon: Users, label: 'Team Members', value: Math.max(...[0, ...boards.map(b => b.members?.length || 0)]), color: 'text-purple-600 bg-purple-50' },
          { icon: Zap, label: 'Completed', value: boards.filter(b => b.status === 'completed').length, color: 'text-green-600 bg-green-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Board grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-3xl" />)}
        </div>
      ) : boards.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Layout size={32} className="text-brand-teal" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No boards yet</h3>
          <p className="text-gray-500 mb-6">Create your first board to get started</p>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={16} className="inline mr-2" /> Create Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <div
              key={board._id}
              onClick={() => navigate(`/boards/${board._id}`)}
              className="card cursor-pointer group p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-teal to-teal-400 rounded-2xl flex items-center justify-center shadow-sm">
                  <Layout size={18} className="text-white" />
                </div>
                <span className={`chip text-xs ${statusColors[board.status] || 'bg-gray-100 text-gray-600'}`}>
                  {board.status?.replace('_', ' ')}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1 group-hover:text-brand-teal transition-colors">
                {board.title}
              </h3>
              {board.clientName && (
                <p className="text-xs text-gray-500 mb-2">📁 {board.clientName}</p>
              )}
              {board.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{board.description}</p>
              )}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                <div className="flex -space-x-2">
                  {board.members?.slice(0, 4).map((m, i) => (
                    <Avatar key={m.user?._id || i} user={m.user} size="xs" className="-ml-2 first:ml-0" />
                  ))}
                  {board.members?.length > 4 && (
                    <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600 border border-white">
                      +{board.members.length - 4}
                    </span>
                  )}
                </div>
                {board.updatedAt && (
                  <span className="text-[10px] text-gray-400">
                    {format(new Date(board.updatedAt), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && <CreateBoardModal onClose={() => setCreateOpen(false)} />}
    </div>
  )
}
