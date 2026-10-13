import { useDispatch, useSelector } from 'react-redux'
import { X } from 'lucide-react'
import { setFilters, selectFilters } from '../../store/boardSlice'
import { selectMembers } from '../../store/boardSlice'
import Avatar from '../ui/Avatar'

const PRIORITIES = ['low', 'medium', 'high']
const DUE_DATE_OPTIONS = [
  { value: 'overdue', label: '🔴 Overdue' },
  { value: 'today', label: '🟡 Due today' },
  { value: 'week', label: '🟢 This week' },
]

export default function FilterPopover({ onClose }) {
  const dispatch = useDispatch()
  const filters = useSelector(selectFilters)
  const members = useSelector(selectMembers)

  const togglePriority = (p) => {
    const current = filters.priorities || []
    dispatch(setFilters({
      priorities: current.includes(p) ? current.filter(x => x !== p) : [...current, p]
    }))
  }

  const toggleMember = (id) => {
    const current = filters.members || []
    dispatch(setFilters({
      members: current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    }))
  }

  const memberUsers = members.map(m => m.user).filter(Boolean)

  return (
    <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-card-hover border border-gray-100 p-4 z-40 w-72 animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm text-gray-800">Filters</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Priority */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Priority</p>
        <div className="flex gap-1.5">
          {PRIORITIES.map(p => (
            <button
              key={p}
              onClick={() => togglePriority(p)}
              className={`chip capitalize transition-all ${
                filters.priorities?.includes(p)
                  ? p === 'low' ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-300'
                    : p === 'medium' ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300'
                    : 'bg-red-100 text-red-600 ring-2 ring-red-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Members */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assignee</p>
        <div className="space-y-1.5">
          {memberUsers.map(user => (
            <label key={user._id} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.members?.includes(user._id)}
                onChange={() => toggleMember(user._id)}
                className="rounded accent-brand-teal"
              />
              <Avatar user={user} size="xs" />
              <span className="text-sm text-gray-700">{user.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Due date */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Due Date</p>
        <div className="space-y-1.5">
          {DUE_DATE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="dueDate"
                checked={filters.dueDate === opt.value}
                onChange={() => dispatch(setFilters({ dueDate: filters.dueDate === opt.value ? null : opt.value }))}
                className="accent-brand-teal"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() => dispatch(setFilters({ priorities: [], members: [], dueDate: null }))}
        className="mt-4 w-full text-sm text-red-400 hover:text-red-600 transition-colors"
      >
        Clear all filters
      </button>
    </div>
  )
}
