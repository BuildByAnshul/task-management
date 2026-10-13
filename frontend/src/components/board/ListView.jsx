import { useSelector, useDispatch } from 'react-redux'
import { selectTasksById } from '../../store/boardSlice'
import { openTaskModal } from '../../store/uiSlice'
import Avatar from '../ui/Avatar'
import PriorityChip from '../ui/PriorityChip'
import {
  Plus, CheckCircle2, Clock, Eye, AlertCircle,
  Calendar, CheckSquare
} from 'lucide-react'

const STATUS_CONFIG = {
  todo: { label: 'To Do', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', badgeClass: 'bg-teal-50 text-brand-teal border-teal-200' },
  review: { label: 'In Review', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  done: { label: 'Completed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export default function ListView() {
  const dispatch = useDispatch()
  const tasksById = useSelector(selectTasksById)
  const tasks = Object.values(tasksById)

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Task List</h2>
          <p className="text-xs text-gray-500">All tasks in tabular view ({tasks.length} total)</p>
        </div>
        <button
          onClick={() => dispatch(openTaskModal({ status: 'todo' }))}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Task
        </button>
      </div>

      {/* Table container */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Task Name</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Subtasks</th>
                <th className="py-3.5 px-4">Assignees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {tasks.length > 0 ? (
                tasks.map(task => {
                  const statusInfo = STATUS_CONFIG[task.status] || {
                    label: task.status,
                    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
                  }
                  const completedSubtasks = task.subtasks?.filter(s => s.completed)?.length || 0
                  const totalSubtasks = task.subtasks?.length || 0

                  return (
                    <tr
                      key={task._id}
                      onClick={() => dispatch(openTaskModal({ taskId: task._id }))}
                      className="hover:bg-teal-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800 group-hover:text-brand-teal transition-colors">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-gray-400 truncate max-w-md mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityChip priority={task.priority} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500">
                        {task.dueDate ? (
                          <span className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500">
                        {totalSubtasks > 0 ? (
                          <span className="flex items-center space-x-1 font-medium">
                            <CheckSquare className="w-3.5 h-3.5 text-brand-teal" />
                            <span>{completedSubtasks}/{totalSubtasks}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex -space-x-1.5">
                          {task.assignedTo?.map(user => (
                            <Avatar key={user._id || user} user={user} size="xs" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    No tasks found. Click "Add Task" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
