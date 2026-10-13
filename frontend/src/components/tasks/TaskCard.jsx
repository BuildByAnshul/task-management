import { useDispatch, useSelector } from 'react-redux'
import { Paperclip, MessageCircle } from 'lucide-react'
import { openTaskModal } from '../../store/uiSlice'
import { selectTyping } from '../../store/boardSlice'
import PriorityChip from '../ui/PriorityChip'
import { AvatarGroup } from '../ui/Avatar'

export default function TaskCard({ task, isDragging = false }) {
  const dispatch = useDispatch()
  const typingMap = useSelector(selectTyping)
  const typingUsers = typingMap[task._id] || []

  const assignees = Array.isArray(task.assignedTo)
    ? task.assignedTo.filter(u => u && (u._id || u))
    : []

  return (
    <div
      data-task-id={task._id}
      onClick={() => dispatch(openTaskModal({ taskId: task._id }))}
      className={`card cursor-pointer select-none ${isDragging ? 'pointer-events-none' : ''}`}
    >
      {/* Priority chip */}
      <div className="mb-2">
        <PriorityChip priority={task.priority} />
      </div>

      {/* Title */}
      <h4 className="font-semibold text-gray-900 text-sm leading-snug mb-1">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1 h-1 bg-brand-teal rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">
            {typingUsers[0]?.user?.name} is typing…
          </span>
        </div>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 font-medium">Progress</span>
          <span className="text-[10px] text-gray-500 font-medium">{task.progress || 0}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${task.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Assignees */}
        <AvatarGroup users={assignees} max={3} size="xs" />

        {/* Stats */}
        <div className="flex items-center gap-2 text-gray-400">
          <span className="flex items-center gap-0.5 text-[10px]">
            <Paperclip size={10} />
            {task.attachments?.length || 0}
          </span>
          <span className="flex items-center gap-0.5 text-[10px]">
            <MessageCircle size={10} />
            {task.commentCount || 0}
          </span>
        </div>
      </div>
    </div>
  )
}
