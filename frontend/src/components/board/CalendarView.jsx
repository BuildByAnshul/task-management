import { useSelector, useDispatch } from 'react-redux'
import { Calendar as CalendarIcon, Clock, ArrowRight } from 'lucide-react'
import { selectTasksById } from '../../store/boardSlice'
import { openTaskModal } from '../../store/uiSlice'
import PriorityChip from '../ui/PriorityChip'
import Avatar from '../ui/Avatar'

export default function CalendarView() {
  const dispatch = useDispatch()
  const tasksById = useSelector(selectTasksById)
  const tasks = Object.values(tasksById)

  const datedTasks = tasks
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

  const undatedTasks = tasks.filter(t => !t.dueDate)

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Timeline & Deadlines</h2>
          <p className="text-xs text-gray-500">Upcoming task schedule for this workspace</p>
        </div>
        <span className="text-xs font-semibold text-brand-teal bg-teal-50 px-3 py-1 rounded-full">
          {datedTasks.length} scheduled
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datedTasks.map(task => {
          const date = new Date(task.dueDate)
          const isOverdue = date < new Date() && task.status !== 'done'

          return (
            <div
              key={task._id}
              onClick={() => dispatch(openTaskModal({ taskId: task._id }))}
              className="card p-4 hover:border-brand-teal/50 cursor-pointer transition-all border border-gray-100 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    isOverdue ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-brand-teal'
                  }`}>
                    <CalendarIcon size={12} />
                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <PriorityChip priority={task.priority} />
                </div>

                <h4 className="text-sm font-bold text-gray-800 group-hover:text-brand-teal transition-colors line-clamp-2">
                  {task.title}
                </h4>

                {task.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {task.status?.replace('_', ' ')}
                </span>
                <div className="flex -space-x-1.5">
                  {task.assignedTo?.map(u => (
                    <Avatar key={u._id || u} user={u} size="xs" />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {datedTasks.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <CalendarIcon size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-semibold text-gray-600">No scheduled tasks yet</p>
          <p className="text-xs text-gray-400 mt-1">Add due dates to your tasks to see them plotted here</p>
        </div>
      )}

      {undatedTasks.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Tasks Without Due Dates ({undatedTasks.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {undatedTasks.map(task => (
              <div
                key={task._id}
                onClick={() => dispatch(openTaskModal({ taskId: task._id }))}
                className="p-3 rounded-2xl bg-gray-50/70 hover:bg-gray-100/90 cursor-pointer border border-gray-100/80 transition-colors"
              >
                <p className="text-xs font-semibold text-gray-800 truncate">{task.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400 uppercase">{task.status?.replace('_', ' ')}</span>
                  <PriorityChip priority={task.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
