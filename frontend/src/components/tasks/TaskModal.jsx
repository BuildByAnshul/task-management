import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Calendar, User, Flag, CheckSquare, Paperclip, MessageCircle, Trash2, Save, Plus } from 'lucide-react'
import { closeTaskModal } from '../../store/uiSlice'
import { selectCurrentBoardId, selectMembers, selectTasksById, selectTyping, upsertTask } from '../../store/boardSlice'
import { startTyping, stopTyping } from '../../lib/socket'
import api from '../../lib/api'
import { v4 as uuidv4 } from '../../lib/uuid'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import PriorityChip from '../ui/PriorityChip'
import Avatar, { AvatarGroup } from '../ui/Avatar'

const PRIORITIES = ['low', 'medium', 'high']
const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Completed' },
]

export default function TaskModal({ taskId, defaultStatus = 'todo', boardId: propBoardId }) {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const storeBoardId = useSelector(selectCurrentBoardId)
  const boardId = propBoardId || storeBoardId
  const members = useSelector(selectMembers)
  const tasksById = useSelector(selectTasksById)
  const typingMap = useSelector(selectTyping)

  const isNew = !taskId
  const existingTask = taskId ? tasksById[taskId] : null

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: defaultStatus,
    dueDate: '',
    assignedTo: [],
    subtasks: [],
    progress: 0,
  })
  const [saveStatus, setSaveStatus] = useState('') // 'saving' | 'saved' | ''
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [newSubtask, setNewSubtask] = useState('')
  const autosaveTimer = useRef(null)
  const originalVersion = useRef(existingTask?.version || 0)

  const typingUsers = typingMap[taskId] || []

  // Initialize form from existing task
  useEffect(() => {
    if (existingTask) {
      setForm({
        title: existingTask.title || '',
        description: existingTask.description || '',
        priority: existingTask.priority || 'medium',
        status: existingTask.status || 'todo',
        dueDate: existingTask.dueDate ? format(new Date(existingTask.dueDate), 'yyyy-MM-dd') : '',
        assignedTo: existingTask.assignedTo?.map(u => u._id || u) || [],
        subtasks: existingTask.subtasks || [],
        progress: existingTask.progress || 0,
      })
      originalVersion.current = existingTask.version || 0
    }
  }, [taskId])

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}/comments`)
      return data.data.comments
    },
    enabled: !!taskId,
  })

  useEffect(() => {
    if (commentsData) setComments(commentsData)
  }, [commentsData])

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const clientMutationId = uuidv4()
      const { data } = await api.post(`/boards/${boardId}/tasks`, { ...formData, clientMutationId })
      return data.data.task
    },
    onSuccess: (task) => {
      dispatch(upsertTask(task))
      queryClient.invalidateQueries(['board', boardId])
      toast.success('Task created!')
      dispatch(closeTaskModal())
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create task'
      toast.error(msg)
    },
  })

  // Update task mutation (debounced autosave)
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const clientMutationId = uuidv4()
      const { data } = await api.patch(`/tasks/${taskId}`, {
        ...updates,
        version: originalVersion.current,
        clientMutationId,
      })
      return data.data.task
    },
    onSuccess: (task) => {
      dispatch(upsertTask(task))
      originalVersion.current = task.version
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        const latest = err.response?.data?.data?.latestTask
        if (latest) {
          toast.error('Conflict: task was updated by someone else. Showing their version.', { duration: 4000 })
          dispatch(upsertTask(latest))
          originalVersion.current = latest.version
          setForm({
            title: latest.title,
            description: latest.description,
            priority: latest.priority,
            status: latest.status,
            dueDate: latest.dueDate ? format(new Date(latest.dueDate), 'yyyy-MM-dd') : '',
            assignedTo: latest.assignedTo?.map(u => u._id || u) || [],
            subtasks: latest.subtasks || [],
            progress: latest.progress || 0,
          })
        }
      } else {
        toast.error('Failed to save')
        setSaveStatus('')
      }
    },
  })

  // Delete task
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/tasks/${taskId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['board', boardId])
      toast.success('Task deleted')
      dispatch(closeTaskModal())
    },
    onError: () => toast.error('Failed to delete task'),
  })

  // Add comment
  const commentMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { text: commentText })
      return data.data.comment
    },
    onSuccess: (comment) => {
      setComments(prev => [comment, ...prev])
      setCommentText('')
    },
    onError: () => toast.error('Failed to add comment'),
  })

  // Autosave on form change
  const handleFormChange = useCallback((updates) => {
    setForm(prev => ({ ...prev, ...updates }))
    if (!isNew && taskId) {
      setSaveStatus('saving')
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => {
        updateMutation.mutate({ ...form, ...updates })
      }, 1000)
    }
    // Typing indicator
    if (updates.title !== undefined || updates.description !== undefined) {
      startTyping(boardId, taskId)
    }
  }, [form, isNew, taskId, boardId, updateMutation])

  // Stop typing on blur
  const handleBlur = () => {
    if (taskId) stopTyping(boardId, taskId)
  }

  // Subtask toggle
  const toggleSubtask = (idx) => {
    const updated = form.subtasks.map((s, i) => i === idx ? { ...s, done: !s.done } : s)
    handleFormChange({ subtasks: updated })
  }

  // Add subtask
  const addSubtask = () => {
    if (!newSubtask.trim()) return
    const updated = [...form.subtasks, { title: newSubtask.trim(), done: false }]
    handleFormChange({ subtasks: updated })
    setNewSubtask('')
  }

  // Member toggle
  const toggleMember = (userId) => {
    const current = form.assignedTo || []
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId]
    handleFormChange({ assignedTo: updated })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (isNew) {
      createMutation.mutate({
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo,
        subtasks: form.subtasks,
      })
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') dispatch(closeTaskModal()) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dispatch])

  const memberUsers = members.map(m => m.user).filter(Boolean)
  const doneSubtasks = form.subtasks.filter(s => s.done).length
  const progress = form.subtasks.length > 0
    ? Math.round((doneSubtasks / form.subtasks.length) * 100)
    : form.progress

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeTaskModal())}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {isNew ? 'New Task' : 'Edit Task'}
              </h2>
              {!isNew && saveStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  saveStatus === 'saving' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                }`}>
                  {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isNew && (
                <button
                  type="button"
                  onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate() }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => dispatch(closeTaskModal())}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && !isNew && (
            <div className="px-6 py-1 bg-teal-50 flex items-center gap-2 text-xs text-teal-600">
              <div className="flex gap-0.5">
                {[0,1,2].map(i => <span key={i} className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: `${i*0.1}s`}} />)}
              </div>
              {typingUsers.map(t => t.user?.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} editing…
            </div>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-5">
            {/* Title */}
            <div>
              <input
                type="text"
                placeholder="Task title…"
                value={form.title}
                onChange={e => handleFormChange({ title: e.target.value })}
                onBlur={handleBlur}
                className="w-full text-lg sm:text-xl font-bold text-gray-900 border-0 outline-none bg-transparent placeholder:text-gray-300 focus:ring-0"
                required
              />
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  <Flag size={10} className="inline mr-1" /> Priority
                </label>
                <div className="flex gap-1.5">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleFormChange({ priority: p })}
                      className={`chip transition-all ${
                        form.priority === p
                          ? p === 'low' ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-300'
                            : p === 'medium' ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300'
                            : 'bg-red-100 text-red-600 ring-2 ring-red-300'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={e => handleFormChange({ status: e.target.value })}
                  className="pill-input text-sm py-1 w-full"
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Due date */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  <Calendar size={10} className="inline mr-1" /> Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => handleFormChange({ dueDate: e.target.value })}
                  className="pill-input text-sm py-1 w-full"
                />
              </div>

              {/* Assignees */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  <User size={10} className="inline mr-1" /> Assignees
                </label>
                <div className="flex flex-wrap gap-1">
                  {memberUsers.map(user => {
                    const isAssigned = form.assignedTo.includes(user._id)
                    return (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => toggleMember(user._id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                          isAssigned ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <Avatar user={user} size="xs" />
                        {user.name.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Description
              </label>
              <textarea
                placeholder="Add a description…"
                value={form.description}
                onChange={e => handleFormChange({ description: e.target.value })}
                onBlur={handleBlur}
                rows={3}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal placeholder:text-gray-400"
              />
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Progress
                </label>
                <span className="text-sm font-bold text-brand-teal">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={form.subtasks.length > 0 ? progress : form.progress}
                disabled={form.subtasks.length > 0}
                onChange={e => handleFormChange({ progress: parseInt(e.target.value) })}
                className="w-full accent-brand-teal h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              {form.subtasks.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">Calculated automatically from subtasks ({progress}%)</p>
              )}
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <CheckSquare size={10} /> Subtasks ({doneSubtasks}/{form.subtasks.length})
                </label>
              </div>
              <div className="space-y-2">
                {form.subtasks.map((subtask, idx) => (
                  <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      onChange={() => toggleSubtask(idx)}
                      className="w-4 h-4 rounded accent-brand-teal"
                    />
                    <span className={`text-sm flex-1 ${subtask.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {subtask.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFormChange({ subtasks: form.subtasks.filter((_, i) => i !== idx) })}
                      className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </label>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add subtask…"
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                    className="flex-1 border border-dashed border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-brand-teal placeholder:text-gray-400"
                  />
                  <button type="button" onClick={addSubtask} className="btn-ghost text-brand-teal">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Comments - only for existing tasks */}
            {!isNew && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3 flex items-center gap-1">
                  <MessageCircle size={10} /> Comments ({comments.length})
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), commentText.trim() && commentMutation.mutate())}
                    className="flex-1 pill-input text-sm py-2"
                  />
                  <button
                    type="button"
                    onClick={() => commentText.trim() && commentMutation.mutate()}
                    disabled={!commentText.trim()}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {comments.map(comment => (
                    <div key={comment._id} className="flex gap-2.5">
                      <Avatar user={comment.author} size="sm" />
                      <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-800">{comment.author?.name}</span>
                          <span className="text-[10px] text-gray-400">
                            {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">No comments yet</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {isNew && (
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dispatch(closeTaskModal())}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary flex items-center gap-1.5"
              >
                <Save size={15} />
                {createMutation.isPending ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
