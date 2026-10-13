import { useSelector, useDispatch } from 'react-redux'
import { X, CheckSquare, Calendar, ArrowRight, User } from 'lucide-react'
import { selectTasksById } from '../../store/boardSlice'
import { selectUser } from '../../store/authSlice'
import { closeMyTasksModal, openTaskModal } from '../../store/uiSlice'
import PriorityChip from '../ui/PriorityChip'

export default function MyTasksModal() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const tasksById = useSelector(selectTasksById)
  const allTasks = Object.values(tasksById)

  // Filter tasks assigned to current user, or all if none specifically assigned
  const myTasks = allTasks.filter(t =>
    t.assignedTo?.some(u => (u._id || u) === (user?._id || user?.id))
  )
  const displayTasks = myTasks.length > 0 ? myTasks : allTasks

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeMyTasksModal())}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-brand-teal">
                <CheckSquare size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">My Tasks</h2>
                <p className="text-xs text-gray-500">
                  {myTasks.length > 0 ? `${myTasks.length} tasks assigned to you` : `All board tasks (${allTasks.length})`}
                </p>
              </div>
            </div>
            <button
              onClick={() => dispatch(closeMyTasksModal())}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="py-4 space-y-2.5 max-h-96 overflow-y-auto">
            {displayTasks.length > 0 ? (
              displayTasks.map(t => (
                <div
                  key={t._id}
                  onClick={() => {
                    dispatch(closeMyTasksModal())
                    dispatch(openTaskModal({ taskId: t._id }))
                  }}
                  className="p-3.5 rounded-2xl bg-gray-50 hover:bg-teal-50/50 border border-gray-100/80 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityChip priority={t.priority} />
                      <span className="text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
                        {t.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-teal transition-colors">
                      {t.title}
                    </p>
                    {t.dueDate && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Calendar size={12} />
                        Due {new Date(t.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:text-brand-teal group-hover:translate-x-0.5 transition-all shadow-sm flex-shrink-0">
                    <ArrowRight size={14} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-400">
                <CheckSquare size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No tasks found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
