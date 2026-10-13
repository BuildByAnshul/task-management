import { format } from 'date-fns'
import { useSelector, useDispatch } from 'react-redux'
import { Share2, Settings, UserPlus } from 'lucide-react'
import { selectBoard, selectMembers, selectPresence } from '../../store/boardSlice'
import { openInviteModal, openSettingsModal } from '../../store/uiSlice'
import { AvatarGroup } from '../ui/Avatar'
import toast from 'react-hot-toast'

const statusConfig = {
  planning: { label: 'Planning', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', className: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-700' },
}

export default function BoardHeader() {
  const board = useSelector(selectBoard)
  const members = useSelector(selectMembers)
  const presence = useSelector(selectPresence)
  const dispatch = useDispatch()

  if (!board) return null

  const status = statusConfig[board.status] || statusConfig.planning
  const memberUsers = members.map(m => m.user).filter(Boolean)
  const onlineCount = presence.length

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => toast.success('Board link copied!'))
  }

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
      {/* Left: title + meta */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{board.title}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          {board.clientName && (
            <>
              <span>Client: <strong className="text-gray-700">{board.clientName}</strong></span>
              <span className="text-gray-300">·</span>
            </>
          )}
          {board.startDate && board.endDate && (
            <>
              <span>
                Timeline:{' '}
                <strong className="text-gray-700">
                  {format(new Date(board.startDate), 'MMM d')} – {format(new Date(board.endDate), 'MMM d, yyyy')}
                </strong>
              </span>
              <span className="text-gray-300">·</span>
            </>
          )}
          <span className={`chip ${status.className}`}>{status.label}</span>
          {onlineCount > 0 && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse-dot" />
              {onlineCount} online
            </span>
          )}
        </div>
      </div>

      {/* Right: members + buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Member avatars with online dots */}
        <AvatarGroup users={memberUsers} max={4} size="md" onlineIds={presence} />

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleShare} className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2">
            <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={() => dispatch(openSettingsModal())}
            className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
          >
            <Settings size={14} /> <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={() => dispatch(openInviteModal())}
            className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
          >
            <UserPlus size={14} /> <span>Invite</span><span className="hidden sm:inline">&nbsp;People</span>
          </button>
        </div>
      </div>
    </div>
  )
}
