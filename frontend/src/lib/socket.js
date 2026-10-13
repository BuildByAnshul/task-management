import { io } from 'socket.io-client'
import { store } from '../store/index'
import {
  upsertTask, removeTask, moveTaskOptimistic, rebalanceColumn,
  setPresence, setTyping, setConnectionStatus,
} from '../store/boardSlice'
import toast from 'react-hot-toast'

let socket = null
let currentBoardId = null
let typingTimers = {}

export const getSocket = () => socket

export const initSocket = (accessToken) => {
  if (socket?.connected) return socket

  socket = io('/', {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  })

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id)
    store.dispatch(setConnectionStatus('connected'))

    // Rejoin board on reconnect
    if (currentBoardId) {
      socket.emit('board:join', { boardId: currentBoardId })
    }
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason)
    store.dispatch(setConnectionStatus('disconnected'))
    store.dispatch(setPresence([]))
  })

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message)
    store.dispatch(setConnectionStatus('reconnecting'))
  })

  socket.on('reconnecting', () => {
    store.dispatch(setConnectionStatus('reconnecting'))
  })

  // ---- Board events ----
  socket.on('task:created', ({ task, clientMutationId, actorId }) => {
    const myId = store.getState().auth.user?._id
    if (actorId === myId) return // ignore own echo
    store.dispatch(upsertTask(task))
    toast.success(`New task: "${task.title}"`, { icon: '📋' })
  })

  socket.on('task:updated', ({ task, clientMutationId, actorId }) => {
    const myId = store.getState().auth.user?._id
    if (actorId === myId) return
    store.dispatch(upsertTask(task))
    // Highlight ring applied via CSS class in component
    highlightTask(task._id)
  })

  socket.on('task:moved', ({ task, fromStatus, toStatus, clientMutationId, actorId }) => {
    const myId = store.getState().auth.user?._id
    if (actorId === myId) return
    store.dispatch(upsertTask(task))
  })

  socket.on('task:deleted', ({ taskId, actorId }) => {
    const myId = store.getState().auth.user?._id
    if (actorId === myId) return
    store.dispatch(removeTask(taskId))
    toast(`Task deleted by team member`, { icon: '🗑️' })
  })

  socket.on('column:rebalanced', ({ status, positions }) => {
    store.dispatch(rebalanceColumn({ status, positions }))
  })

  socket.on('presence:update', ({ onlineUsers }) => {
    store.dispatch(setPresence(onlineUsers))
  })

  socket.on('presence:join', ({ user }) => {
    // toast(`${user.name} joined`, { icon: '👋', duration: 2000 })
  })

  socket.on('presence:leave', ({ userId }) => {
    const state = store.getState().board.presence
    store.dispatch(setPresence(state.filter(id => id !== userId)))
  })

  socket.on('typing:update', ({ taskId, user, isTyping }) => {
    store.dispatch(setTyping({ taskId, user, isTyping }))
  })

  socket.on('error', ({ message }) => {
    console.error('Socket error from server:', message)
  })

  return socket
}

export const joinBoard = (boardId) => {
  currentBoardId = boardId
  if (socket?.connected) {
    socket.emit('board:join', { boardId })
  }
}

export const leaveBoard = (boardId) => {
  currentBoardId = null
  if (socket?.connected) {
    socket.emit('board:leave', { boardId })
    store.dispatch(setPresence([]))
  }
}

export const startTyping = (boardId, taskId) => {
  if (!socket?.connected) return
  socket.emit('task:typing:start', { boardId, taskId })

  // Debounce stop after 2s
  if (typingTimers[taskId]) clearTimeout(typingTimers[taskId])
  typingTimers[taskId] = setTimeout(() => {
    stopTyping(boardId, taskId)
  }, 2000)
}

export const stopTyping = (boardId, taskId) => {
  if (!socket?.connected) return
  socket.emit('task:typing:stop', { boardId, taskId })
  if (typingTimers[taskId]) {
    clearTimeout(typingTimers[taskId])
    delete typingTimers[taskId]
  }
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Map of taskId -> highlight timeout
const highlightTimeouts = {}
export const highlightTask = (taskId) => {
  const el = document.querySelector(`[data-task-id="${taskId}"]`)
  if (el) {
    el.classList.add('highlight-ring')
    if (highlightTimeouts[taskId]) clearTimeout(highlightTimeouts[taskId])
    highlightTimeouts[taskId] = setTimeout(() => {
      el.classList.remove('highlight-ring')
      delete highlightTimeouts[taskId]
    }, 2000)
  }
}
