import { useState, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, TouchSensor,
  useSensor, useSensors, closestCorners, MeasuringStrategy
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Search, SlidersHorizontal, ChevronDown, Plus } from 'lucide-react'
import { useSelector as useReduxSelector } from 'react-redux'
import {
  selectColumnOrder, selectTasksById, selectFilters, selectSort,
  setFilters, setSort, moveTaskOptimistic, upsertTask
} from '../../store/boardSlice'
import { selectCurrentBoardId } from '../../store/boardSlice'
import { openTaskModal } from '../../store/uiSlice'
import api from '../../lib/api'
import { v4 as uuidv4 } from '../../lib/uuid'
import KanbanColumn from './KanbanColumn'
import TaskCard from '../tasks/TaskCard'
import FilterPopover from './FilterPopover'
import toast from 'react-hot-toast'

const COLUMN_CONFIG = [
  { key: 'todo', label: 'To Do', bg: '#FDE8EF', dot: '#F472B6' },
  { key: 'in_progress', label: 'In Progress', bg: '#FEF0E7', dot: '#FB923C' },
  { key: 'review', label: 'In Review', bg: '#E0F2FE', dot: '#38BDF8' },
  { key: 'done', label: 'Completed', bg: '#EDE9FE', dot: '#A78BFA' },
]

export default function BoardView() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const boardId = useSelector(selectCurrentBoardId)
  const tasksById = useSelector(selectTasksById)
  const columnOrder = useSelector(selectColumnOrder)
  const filters = useSelector(selectFilters)
  const sort = useSelector(selectSort)

  const [activeTask, setActiveTask] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const dragStartData = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const moveMutation = useMutation({
    mutationFn: async ({ taskId, toStatus, toIndex, version, clientMutationId }) => {
      const { data } = await api.patch(`/tasks/${taskId}/move`, { toStatus, toIndex, version, clientMutationId })
      return data.data
    },
    onSuccess: (data) => {
      if (data.task) dispatch(upsertTask(data.task))
      queryClient.invalidateQueries(['board', boardId])
    },
    onError: (err, variables) => {
      // Rollback optimistic update
      queryClient.invalidateQueries(['board', boardId])
      if (err.response?.status === 409) {
        const latest = err.response?.data?.data?.latestTask
        if (latest) dispatch(upsertTask(latest))
        toast.error('Move conflict — showing latest position')
      } else {
        toast.error('Failed to move task')
      }
    },
  })

  const handleDragStart = useCallback((event) => {
    const { active } = event
    const task = tasksById[active.id]
    if (task) {
      setActiveTask(task)
      dragStartData.current = { taskId: task._id, fromStatus: task.status }
    }
  }, [tasksById])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || !dragStartData.current) { dragStartData.current = null; return }

    const task = tasksById[active.id]
    if (!task) { dragStartData.current = null; return }

    // Determine drop target
    let toStatus = task.status
    let toIndex = 0

    // If dropped on a column (droppable area)
    if (COLUMN_CONFIG.find(c => c.key === over.id)) {
      toStatus = over.id
      toIndex = (columnOrder[toStatus] || []).length
    } else {
      // Dropped on another task
      const overTask = tasksById[over.id]
      if (overTask) {
        toStatus = overTask.status
        const col = columnOrder[toStatus] || []
        toIndex = col.indexOf(over.id)
        if (toIndex === -1) toIndex = col.length
      }
    }

    const fromStatus = dragStartData.current.fromStatus
    const taskId = task._id
    dragStartData.current = null

    // Optimistic update
    dispatch(moveTaskOptimistic({ taskId, fromStatus, toStatus, toIndex }))

    // API call
    const clientMutationId = uuidv4()
    moveMutation.mutate({
      taskId,
      toStatus,
      toIndex,
      version: task.version,
      clientMutationId,
    })
  }, [tasksById, columnOrder, dispatch, moveMutation])

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    dragStartData.current = null
    queryClient.invalidateQueries(['board', boardId])
  }, [boardId, queryClient])

  const SORT_OPTIONS = [
    { value: 'stage', label: 'Stage' },
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due date' },
    { value: 'updatedAt', label: 'Recently updated' },
  ]

  const hasActiveFilters = filters.priorities?.length || filters.members?.length || filters.dueDate || filters.search

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search task"
            value={filters.search}
            onChange={e => dispatch(setFilters({ search: e.target.value }))}
            className="pill-input pl-8 pr-4 w-36 sm:w-48 text-xs sm:text-sm py-1.5"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="btn-secondary text-sm py-1.5 flex items-center gap-1.5"
          >
            Sort by: <strong>{SORT_OPTIONS.find(o => o.value === sort)?.label}</strong>
            <ChevronDown size={13} />
          </button>
          {sortOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-card-hover border border-gray-100 py-1 z-30 w-44 animate-scale-in">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { dispatch(setSort(opt.value)); setSortOpen(false) }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${sort === opt.value ? 'text-brand-teal font-semibold' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`btn-secondary text-sm py-1.5 flex items-center gap-1.5 ${hasActiveFilters ? 'border-brand-teal text-brand-teal' : ''}`}
          >
            <SlidersHorizontal size={14} /> Filter
            {hasActiveFilters && (
              <span className="w-4 h-4 bg-brand-teal text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {[filters.priorities?.length > 0, filters.members?.length > 0, !!filters.dueDate].filter(Boolean).length}
              </span>
            )}
          </button>
          {filterOpen && <FilterPopover onClose={() => setFilterOpen(false)} />}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => dispatch(setFilters({ search: '', priorities: [], members: [], dueDate: null }))}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            ✕ Clear filters
          </button>
        )}

        {/* Add task */}
        <button
          onClick={() => dispatch(openTaskModal({ status: 'todo' }))}
          className="btn-primary ml-auto flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap"
        >
          <Plus size={15} /> Add New Task
        </button>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <div className="flex gap-4 px-4 sm:px-6 pb-6 overflow-x-auto flex-1 items-start scroll-smooth">
          {COLUMN_CONFIG.map(col => (
            <KanbanColumn key={col.key} config={col} />
          ))}
        </div>

        {/* Drag overlay - shows dragged card with tilt */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask ? (
            <div className="drag-overlay-card w-72">
              <TaskCard task={activeTask} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
