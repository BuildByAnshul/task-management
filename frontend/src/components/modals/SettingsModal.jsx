import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X, Settings, Trash2, Save, AlertTriangle } from 'lucide-react'
import { selectBoard, selectCurrentBoardId } from '../../store/boardSlice'
import { selectUser } from '../../store/authSlice'
import { closeSettingsModal, openProfileModal } from '../../store/uiSlice'
import Avatar from '../ui/Avatar'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function SettingsModal() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const board = useSelector(selectBoard)
  const boardId = useSelector(selectCurrentBoardId)
  const user = useSelector(selectUser)

  const [form, setForm] = useState({
    title: board?.title || '',
    clientName: board?.clientName || '',
    description: board?.description || '',
    status: board?.status || 'planning',
  })

  useEffect(() => {
    if (board) {
      setForm({
        title: board.title || '',
        clientName: board.clientName || '',
        description: board.description || '',
        status: board.status || 'planning',
      })
    }
  }, [board])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/boards/${boardId}`, form)
      return data.data.board
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['board', boardId])
      queryClient.invalidateQueries(['boards'])
      toast.success('Board settings updated!')
      dispatch(closeSettingsModal())
    },
    onError: () => toast.error('Failed to update board'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/boards/${boardId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['boards'])
      toast.success('Board deleted')
      dispatch(closeSettingsModal())
      navigate('/')
    },
    onError: () => toast.error('Failed to delete board'),
  })

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeSettingsModal())}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                <Settings size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Board Settings</h2>
                <p className="text-xs text-gray-500">Configure workspace details</p>
              </div>
            </div>
            <button
              onClick={() => dispatch(closeSettingsModal())}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 p-3 rounded-2xl bg-teal-50/50 border border-teal-100/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar user={user} size="sm" />
              <div>
                <p className="text-xs font-bold text-gray-800">{user?.name}</p>
                <p className="text-[10px] text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                dispatch(closeSettingsModal())
                dispatch(openProfileModal())
              }}
              className="text-xs font-bold text-brand-teal hover:underline cursor-pointer"
            >
              Edit Profile →
            </button>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault()
              updateMutation.mutate()
            }}
            className="py-4 space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Board Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="pill-input w-full text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Client Name</label>
              <input
                type="text"
                placeholder="e.g. Arcadia Solutions"
                value={form.clientName}
                onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                className="pill-input w-full text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="pill-input w-full text-sm bg-white cursor-pointer"
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Workspace notes or description..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-2xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              />
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
                    deleteMutation.mutate()
                  }
                }}
                className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} /> Delete Board
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => dispatch(closeSettingsModal())}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary text-xs"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
