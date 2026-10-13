import { useDispatch } from 'react-redux'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { MoreHorizontal, Plus } from 'lucide-react'
import { selectFilteredColumn } from '../../store/boardSlice'
import { openTaskModal } from '../../store/uiSlice'
import { useSelector } from 'react-redux'
import SortableTaskCard from '../tasks/SortableTaskCard'

export default function KanbanColumn({ config }) {
  const dispatch = useDispatch()
  const tasks = useSelector(selectFilteredColumn(config.key))
  const { setNodeRef, isOver } = useDroppable({ id: config.key })

  return (
    <div
      className="flex-shrink-0 w-72 rounded-3xl flex flex-col"
      style={{ backgroundColor: config.bg, minHeight: '200px' }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.dot }} />
          <h3 className="font-semibold text-gray-800 text-sm">{config.label}</h3>
          <span className="text-xs text-gray-400 bg-white/50 rounded-full px-1.5 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <button className="w-7 h-7 rounded-full hover:bg-white/60 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className={`flex-1 px-3 pb-3 flex flex-col gap-2.5 min-h-[100px] rounded-b-3xl transition-colors duration-200 ${isOver ? 'bg-white/20' : ''}`}
      >
        <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task._id} task={task} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div
            className={`flex-1 rounded-2xl border-2 border-dashed flex items-center justify-center min-h-[80px] transition-colors ${isOver ? 'border-gray-400 bg-white/30' : 'border-white/50'}`}
          >
            <span className="text-xs text-gray-400">Drop here</span>
          </div>
        )}

        {/* Add task button */}
        <button
          onClick={() => dispatch(openTaskModal({ status: config.key }))}
          className="w-full flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm text-gray-400 hover:text-gray-600 hover:bg-white/40 transition-all group"
        >
          <Plus size={14} className="group-hover:text-brand-teal" />
          Add task
        </button>
      </div>
    </div>
  )
}
