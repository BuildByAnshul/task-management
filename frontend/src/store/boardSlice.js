import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // Board data
  currentBoardId: null,
  board: null,
  // Normalized tasks: { [taskId]: task }
  tasksById: {},
  // Column order: { [status]: [taskId, ...] }
  columnOrder: { todo: [], in_progress: [], review: [], done: [] },
  members: [],
  // Real-time state
  presence: [], // array of online user ids
  typing: {},   // { [taskId]: [{ user, isTyping }] }
  // Connection
  connectionStatus: 'disconnected', // connected | disconnected | reconnecting
  // Filters
  filters: {
    search: '',
    priorities: [],
    members: [],
    dueDate: null,
  },
  sort: 'stage', // stage | priority | dueDate | updatedAt
  // View
  activeTab: 'board',
  // Versions
  boardVersion: 0,
  lastEventId: null,
  // Pending offline mutations
  offlineQueue: [],
}

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    setBoardData: (state, action) => {
      const { board, columns, boardVersion, lastEventId } = action.payload
      state.board = board
      state.currentBoardId = board._id
      state.members = board.members || []
      state.boardVersion = boardVersion || 0
      state.lastEventId = lastEventId

      // Normalize tasks
      state.tasksById = {}
      const order = { todo: [], in_progress: [], review: [], done: [] }
      Object.entries(columns).forEach(([status, tasks]) => {
        tasks.forEach(task => {
          state.tasksById[task._id] = task
          order[status].push(task._id)
        })
      })
      state.columnOrder = order
    },

    upsertTask: (state, action) => {
      const task = action.payload
      const taskId = task._id
      const oldTask = state.tasksById[taskId]

      // Remove from old column if status changed
      if (oldTask && oldTask.status !== task.status) {
        state.columnOrder[oldTask.status] = state.columnOrder[oldTask.status].filter(id => id !== taskId)
      }

      state.tasksById[taskId] = task

      // Ensure in correct column
      if (!state.columnOrder[task.status]) state.columnOrder[task.status] = []
      if (!state.columnOrder[task.status].includes(taskId)) {
        state.columnOrder[task.status].push(taskId)
      }

      // Re-sort by position
      state.columnOrder[task.status].sort((a, b) => {
        const posA = state.tasksById[a]?.position || 0
        const posB = state.tasksById[b]?.position || 0
        return posA - posB
      })
    },

    removeTask: (state, action) => {
      const taskId = action.payload
      const task = state.tasksById[taskId]
      if (task) {
        state.columnOrder[task.status] = state.columnOrder[task.status].filter(id => id !== taskId)
        delete state.tasksById[taskId]
      }
    },

    moveTaskOptimistic: (state, action) => {
      const { taskId, fromStatus, toStatus, toIndex } = action.payload
      // Remove from old column
      state.columnOrder[fromStatus] = state.columnOrder[fromStatus].filter(id => id !== taskId)
      // Insert into new column at index
      const col = state.columnOrder[toStatus] || []
      const clampedIdx = Math.max(0, Math.min(toIndex, col.length))
      col.splice(clampedIdx, 0, taskId)
      state.columnOrder[toStatus] = col
      // Update task status
      if (state.tasksById[taskId]) {
        state.tasksById[taskId] = { ...state.tasksById[taskId], status: toStatus }
      }
    },

    rebalanceColumn: (state, action) => {
      const { status, positions } = action.payload
      positions.forEach(({ taskId, position }) => {
        if (state.tasksById[taskId]) {
          state.tasksById[taskId] = { ...state.tasksById[taskId], position }
        }
      })
      state.columnOrder[status].sort((a, b) => {
        const posA = state.tasksById[a]?.position || 0
        const posB = state.tasksById[b]?.position || 0
        return posA - posB
      })
    },

    setPresence: (state, action) => {
      state.presence = action.payload
    },

    setTyping: (state, action) => {
      const { taskId, user, isTyping } = action.payload
      if (!state.typing[taskId]) state.typing[taskId] = []
      if (isTyping) {
        const exists = state.typing[taskId].find(t => t.user._id === user._id)
        if (!exists) state.typing[taskId].push({ user, isTyping: true })
      } else {
        state.typing[taskId] = state.typing[taskId].filter(t => t.user._id !== user._id)
      }
    },

    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload
    },

    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },

    clearFilters: (state) => {
      state.filters = { search: '', priorities: [], members: [], dueDate: null }
    },

    setSort: (state, action) => {
      state.sort = action.payload
    },

    setActiveTab: (state, action) => {
      state.activeTab = action.payload
    },

    addToOfflineQueue: (state, action) => {
      if (state.offlineQueue.length < 50) {
        state.offlineQueue.push(action.payload)
      }
    },

    clearOfflineQueue: (state) => {
      state.offlineQueue = []
    },

    resetBoard: (state) => {
      return { ...initialState }
    },
  },
})

export const {
  setBoardData, upsertTask, removeTask, moveTaskOptimistic, rebalanceColumn,
  setPresence, setTyping, setConnectionStatus,
  setFilters, clearFilters, setSort, setActiveTab,
  addToOfflineQueue, clearOfflineQueue, resetBoard,
} = boardSlice.actions

// Selectors
export const selectBoard = (state) => state.board.board
export const selectCurrentBoardId = (state) => state.board.currentBoardId
export const selectTasksById = (state) => state.board.tasksById
export const selectColumnOrder = (state) => state.board.columnOrder
export const selectMembers = (state) => state.board.members
export const selectPresence = (state) => state.board.presence
export const selectTyping = (state) => state.board.typing
export const selectConnectionStatus = (state) => state.board.connectionStatus
export const selectFilters = (state) => state.board.filters
export const selectSort = (state) => state.board.sort
export const selectActiveTab = (state) => state.board.activeTab
export const selectOfflineQueue = (state) => state.board.offlineQueue

// Derived selector: filtered + sorted column tasks
export const selectFilteredColumn = (status) => (state) => {
  const { tasksById, columnOrder, filters, sort } = state.board
  let taskIds = columnOrder[status] || []
  let tasks = taskIds.map(id => tasksById[id]).filter(Boolean)

  // Filter
  if (filters.search) {
    const q = filters.search.toLowerCase()
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
  }
  if (filters.priorities?.length) {
    tasks = tasks.filter(t => filters.priorities.includes(t.priority))
  }
  if (filters.members?.length) {
    tasks = tasks.filter(t => t.assignedTo?.some(u => filters.members.includes(u._id || u)))
  }
  if (filters.dueDate) {
    const now = new Date()
    if (filters.dueDate === 'overdue') tasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now)
    if (filters.dueDate === 'today') tasks = tasks.filter(t => {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      return d.toDateString() === now.toDateString()
    })
    if (filters.dueDate === 'week') tasks = tasks.filter(t => {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return d >= now && d <= week
    })
  }

  // Sort
  if (sort === 'priority') {
    const p = { high: 0, medium: 1, low: 2 }
    tasks = [...tasks].sort((a, b) => (p[a.priority] || 1) - (p[b.priority] || 1))
  } else if (sort === 'dueDate') {
    tasks = [...tasks].sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate) - new Date(b.dueDate)
    })
  } else if (sort === 'updatedAt') {
    tasks = [...tasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  } else {
    // Default: by position
    tasks = [...tasks].sort((a, b) => (a.position || 0) - (b.position || 0))
  }

  return tasks
}

export default boardSlice.reducer
