const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth');
const Board = require('../models/Board');

let io = null;

// Presence: boardId -> Map<userId, Set<socketId>>
const presenceMap = new Map();

// Typing: boardId -> Map<taskId, Map<userId, timer>>
const typingMap = new Map();

const getPresence = (boardId) => {
  const board = presenceMap.get(boardId.toString());
  if (!board) return [];
  return Array.from(board.keys());
};

const getIO = () => io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket auth middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 Socket connected: ${user.name} (${socket.id})`);

    // board:join
    socket.on('board:join', async ({ boardId }) => {
      try {
        const board = await Board.findById(boardId).select('members');
        if (!board) return socket.emit('error', { message: 'Board not found' });

        const isMember = board.members.some(m => m.user.toString() === user._id.toString());
        if (!isMember) return socket.emit('error', { message: 'Not a board member' });

        const room = `board:${boardId}`;
        await socket.join(room);

        // Update presence
        if (!presenceMap.has(boardId)) presenceMap.set(boardId, new Map());
        const boardPresence = presenceMap.get(boardId);
        if (!boardPresence.has(user._id.toString())) {
          boardPresence.set(user._id.toString(), new Set());
        }
        boardPresence.get(user._id.toString()).add(socket.id);

        // Broadcast presence update
        const onlineUsers = Array.from(boardPresence.keys());
        io.to(room).emit('presence:update', { onlineUsers });
        socket.to(room).emit('presence:join', { user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl } });

        console.log(`👤 ${user.name} joined board:${boardId}`);
      } catch (err) {
        console.error('board:join error:', err.message);
        socket.emit('error', { message: 'Failed to join board' });
      }
    });

    // board:leave
    socket.on('board:leave', ({ boardId }) => {
      leaveBoard(socket, boardId);
    });

    // task:typing:start
    socket.on('task:typing:start', ({ boardId, taskId }) => {
      const room = `board:${boardId}`;
      socket.to(room).emit('typing:update', {
        taskId,
        user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl },
        isTyping: true,
      });

      // Auto-expire typing after 5s
      if (!typingMap.has(boardId)) typingMap.set(boardId, new Map());
      const boardTyping = typingMap.get(boardId);
      const key = `${taskId}:${user._id}`;
      if (boardTyping.has(key)) clearTimeout(boardTyping.get(key));
      const timer = setTimeout(() => {
        boardTyping.delete(key);
        socket.to(room).emit('typing:update', {
          taskId,
          user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl },
          isTyping: false,
        });
      }, 5000);
      boardTyping.set(key, timer);
    });

    // task:typing:stop
    socket.on('task:typing:stop', ({ boardId, taskId }) => {
      const room = `board:${boardId}`;
      socket.to(room).emit('typing:update', {
        taskId,
        user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl },
        isTyping: false,
      });

      if (typingMap.has(boardId)) {
        const key = `${taskId}:${user._id}`;
        const timer = typingMap.get(boardId).get(key);
        if (timer) {
          clearTimeout(timer);
          typingMap.get(boardId).delete(key);
        }
      }
    });

    // presence:ping - keepalive
    socket.on('presence:ping', ({ boardId }) => {
      socket.emit('presence:pong', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${user.name} (${socket.id})`);

      // Remove from all board presences
      for (const [boardId, boardPresence] of presenceMap.entries()) {
        const userId = user._id.toString();
        if (boardPresence.has(userId)) {
          const sockets = boardPresence.get(userId);
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            boardPresence.delete(userId);
            const room = `board:${boardId}`;
            const onlineUsers = Array.from(boardPresence.keys());
            io.to(room).emit('presence:update', { onlineUsers });
            io.to(room).emit('presence:leave', { userId });
          }
        }
        if (boardPresence.size === 0) presenceMap.delete(boardId);
      }

      // Clear all typing indicators for this user
      for (const [boardId, boardTyping] of typingMap.entries()) {
        for (const [key, timer] of boardTyping.entries()) {
          if (key.endsWith(`:${user._id}`)) {
            clearTimeout(timer);
            boardTyping.delete(key);
            const [taskId] = key.split(':');
            io.to(`board:${boardId}`).emit('typing:update', {
              taskId,
              user: { _id: user._id },
              isTyping: false,
            });
          }
        }
      }
    });
  });

  return io;
};

const leaveBoard = (socket, boardId) => {
  const userId = socket.user._id.toString();
  const room = `board:${boardId}`;
  socket.leave(room);

  if (presenceMap.has(boardId)) {
    const boardPresence = presenceMap.get(boardId);
    if (boardPresence.has(userId)) {
      boardPresence.get(userId).delete(socket.id);
      if (boardPresence.get(userId).size === 0) {
        boardPresence.delete(userId);
        const onlineUsers = Array.from(boardPresence.keys());
        io.to(room).emit('presence:update', { onlineUsers });
        io.to(room).emit('presence:leave', { userId });
      }
    }
  }
};

module.exports = { initSocket, getIO, getPresence };
