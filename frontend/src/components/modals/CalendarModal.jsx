import { useSelector, useDispatch } from 'react-redux'
import { X, Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react'
import { selectTasksById } from '../../store/boardSlice'
import { closeCalendarModal, openTaskModal } from '../../store/uiSlice'
import PriorityChip from '../ui/PriorityChip'

export default function CalendarModal() {
  const dispatch = useDispatch()
  const tasksById = useSelector(selectTasksById)
  const tasks = Object.values(tasksById)

  // Sort tasks by due date
  const datedTasks = tasks
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

  const undatedTasks = tasks.filter(t => !t.dueDate)

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeCalendarModal())}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <CalendarIcon size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Schedule & Calendar</h2>
                <p className="text-xs text-gray-500">{datedTasks.length} scheduled tasks</p>
              </div>
            </div>
            <button
              onClick={() => dispatch(closeCalendarModal())}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="py-4 space-y-3 max-h-96 overflow-y-auto">
            {datedTasks.length > 0 ? (
              datedTasks.map(t => {
                const date = new Date(t.dueDate)
                const isOverdue = date < new Date() && t.status !== 'done'

                return (
                  <div
                    key={t._id}
                    onClick={() => {
                      dispatch(closeCalendarModal())
                      dispatch(openTaskModal({ taskId: t._id }))
                    }}
                    className="p-3.5 rounded-2xl bg-gray-50/80 hover:bg-gray-100/90 border border-gray-100 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-brand-teal'}`}>
                        <span className="text-[10px] font-bold uppercase leading-none">{date.toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-base font-extrabold leading-none mt-1">{date.getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-teal transition-colors">
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <PriorityChip priority={t.priority} />
                          <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                            {isOverdue ? 'Overdue' : 'On track'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-teal transition-colors flex-shrink-0" />
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-gray-400">
                <Clock size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No tasks with due dates found</p>
              </div>
            )}

            {undatedTasks.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Unscheduled ({undatedTasks.length})</p>
                <div className="space-y-1.5">
                  {undatedTasks.slice(0, 3).map(t => (
                    <div
                      key={t._id}
                      onClick={() => {
                        dispatch(closeCalendarModal())
                        dispatch(openTaskModal({ taskId: t._id }))
                      }}
                      className="px-3 py-2 rounded-xl bg-gray-50/50 hover:bg-gray-100 text-xs font-medium text-gray-600 cursor-pointer flex justify-between items-center"
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-[10px] text-gray-400">No date</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
