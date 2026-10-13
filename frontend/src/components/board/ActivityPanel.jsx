import { useInfiniteQuery } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { X, Activity } from 'lucide-react'
import { toggleActivityPanel } from '../../store/uiSlice'
import api from '../../lib/api'
import { format } from 'date-fns'
import Avatar from '../ui/Avatar'

const activityIcons = {
  task_created: '📋',
  task_moved: '↗️',
  task_updated: '✏️',
  task_deleted: '🗑️',
  member_joined: '👋',
  comment_added: '💬',
  file_uploaded: '📎',
  board_created: '🎯',
}

const activityText = (a) => {
  const t = a.task?.title ? `"${a.task.title}"` : 'a task'
  switch (a.type) {
    case 'task_created': return `created ${t}`
    case 'task_moved': return `moved ${t} from ${a.meta?.from} → ${a.meta?.to}`
    case 'task_updated': return `updated ${t}`
    case 'task_deleted': return `deleted ${t}`
    case 'member_joined': return `joined the board`
    case 'comment_added': return `commented on ${t}`
    case 'file_uploaded': return `uploaded a file to ${t}`
    case 'board_created': return `created this board`
    default: return a.type
  }
}

export default function ActivityPanel({ boardId }) {
  const dispatch = useDispatch()

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['activity', boardId],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get(`/boards/${boardId}/activity`, {
        params: { limit: 20, cursor: pageParam },
      })
      return data.data
    },
    getNextPageParam: (last) => last.nextCursor || undefined,
    initialPageParam: undefined,
  })

  const activities = data?.pages.flatMap(p => p.activities) || []

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Activity size={18} className="text-brand-teal" /> Activity
        </h3>
        <button onClick={() => dispatch(toggleActivityPanel())}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activities.map((activity) => (
          <div key={activity._id} className="flex gap-2.5 group">
            <Avatar user={activity.actor} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-snug">
                <span className="font-semibold">{activity.actor?.name}</span>{' '}
                <span className="mr-1">{activityIcons[activity.type]}</span>
                {activityText(activity)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
              </p>
            </div>
          </div>
        ))}
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetching}
            className="w-full text-center text-sm text-brand-teal hover:underline py-2"
          >
            {isFetching ? 'Loading…' : 'Load more'}
          </button>
        )}
        {activities.length === 0 && !isFetching && (
          <p className="text-center text-gray-400 text-sm py-8">No activity yet</p>
        )}
      </div>
    </div>
  )
}
