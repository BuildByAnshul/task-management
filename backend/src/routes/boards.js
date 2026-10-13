const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Board = require('../models/Board');
const Task = require('../models/Task');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');
const { isBoardMember, isBoardAdmin, isBoardOwner, canMutate } = require('../middleware/boardAuth');
const { logActivity } = require('../services/activityService');
const { getEndPosition } = require('../services/positionService');
const { getIO, getPresence } = require('../sockets');

// POST /api/boards - create
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, clientName, startDate, endDate, status } = req.body;
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'title required' } });

    const board = await Board.create({
      title,
      description,
      clientName,
      startDate,
      endDate,
      status: status || 'planning',
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'owner', joinedAt: new Date() }],
    });

    await logActivity({ boardId: board._id, actorId: req.user._id, type: 'board_created', meta: { title } });

    res.status(201).json({ success: true, data: { board } });
  } catch (err) { next(err); }
});

// GET /api/boards - list user's boards
router.get('/', authenticate, async (req, res, next) => {
  try {
    const boards = await Board.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: { boards } });
  } catch (err) { next(err); }
});

// Accept invite - before :id routes
router.post('/invites/:token/accept', authenticate, async (req, res, next) => {
  try {
    const { token } = req.params;
    const board = await Board.findOne({ 'invites.token': token });
    if (!board) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invite not found' } });

    const invite = board.invites.find(i => i.token === token);
    if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID', message: 'Invite expired or already used' } });
    }

    const alreadyMember = board.members.find(m => m.user.toString() === req.user._id.toString());
    if (!alreadyMember) {
      board.members.push({ user: req.user._id, role: invite.role, joinedAt: new Date() });
    }

    invite.status = 'accepted';
    await board.save();
    await logActivity({ boardId: board._id, actorId: req.user._id, type: 'member_joined', meta: { role: invite.role } });

    const io = getIO();
    if (io) io.to(`board:${board._id}`).emit('member:joined', { user: req.user, role: invite.role });

    res.json({ success: true, data: { board: { _id: board._id, title: board.title } } });
  } catch (err) { next(err); }
});

// GET /api/boards/:id
router.get('/:id', authenticate, isBoardMember, async (req, res, next) => {
  try {
    const boardId = req.params.id;
    const board = await Board.findById(boardId)
      .populate('members.user', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl');

    // Get all tasks grouped by column
    const tasks = await Task.find({ board: boardId })
      .populate('assignedTo', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl')
      .sort({ position: 1 });

    const columns = {};
    const statusKeys = ['todo', 'in_progress', 'review', 'done'];
    statusKeys.forEach(key => { columns[key] = []; });
    tasks.forEach(task => {
      if (columns[task.status]) columns[task.status].push(task);
    });

    // Get online presence
    const onlineUserIds = getPresence(boardId);
    const membersWithOnline = board.members.map(m => ({
      ...m.toObject(),
      isOnline: onlineUserIds.includes(m.user._id.toString()),
    }));

    res.json({
      success: true,
      data: {
        board: { ...board.toObject(), members: membersWithOnline },
        columns,
        boardVersion: board.boardVersion,
        lastEventId: board.lastEventId,
      },
    });
  } catch (err) { next(err); }
});

// POST /api/boards/:boardId/tasks - create task in board
router.post('/:boardId/tasks', authenticate, isBoardMember, canMutate, async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;
    const { title, description, priority, dueDate, assignedTo, status = 'todo', subtasks, clientMutationId } = req.body;
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'title required' } });

    const position = await getEndPosition(boardId, status);
    const task = await Task.create({
      board: boardId,
      title,
      description: description || '',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      assignedTo: assignedTo || [],
      status,
      position,
      subtasks: subtasks || [],
      createdBy: req.user._id,
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl');

    await logActivity({ boardId, taskId: task._id, actorId: req.user._id, type: 'task_created', meta: { title, status } });

    const io = getIO();
    if (io) {
      io.to(`board:${boardId}`).emit('task:created', {
        task: populated,
        clientMutationId,
        actorId: req.user._id,
      });
    }

    res.status(201).json({ success: true, data: { task: populated } });
  } catch (err) { next(err); }
});

// PATCH /api/boards/:id
router.patch('/:id', authenticate, isBoardAdmin, async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'clientName', 'startDate', 'endDate', 'status'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const board = await Board.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('members.user', 'name email avatarUrl');

    const io = getIO();
    if (io) io.to(`board:${req.params.id}`).emit('board:updated', { board });

    res.json({ success: true, data: { board } });
  } catch (err) { next(err); }
});

// DELETE /api/boards/:id
router.delete('/:id', authenticate, isBoardOwner, async (req, res, next) => {
  try {
    await Task.deleteMany({ board: req.params.id });
    await Activity.deleteMany({ board: req.params.id });
    await Board.findByIdAndDelete(req.params.id);

    const io = getIO();
    if (io) io.to(`board:${req.params.id}`).emit('board:deleted', { boardId: req.params.id });

    res.json({ success: true, data: { message: 'Board deleted' } });
  } catch (err) { next(err); }
});

// POST /api/boards/:id/invite
router.post('/:id/invite', authenticate, isBoardAdmin, async (req, res, next) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'email required' } });

    const board = req.board;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Remove existing pending invite for same email
    board.invites = board.invites.filter(i => i.email !== email.toLowerCase() || i.status !== 'pending');
    board.invites.push({ email: email.toLowerCase(), token, role, expiresAt, status: 'pending' });
    await board.save();

    const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;
    res.json({ success: true, data: { token, inviteLink, expiresAt } });
  } catch (err) { next(err); }
});

// DELETE /api/boards/:id/members/:userId
router.delete('/:id/members/:userId', authenticate, isBoardAdmin, async (req, res, next) => {
  try {
    const board = req.board;
    const targetId = req.params.userId;
    const targetMember = board.members.find(m => m.user.toString() === targetId);
    if (!targetMember) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
    if (targetMember.role === 'owner') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot remove owner' } });

    board.members = board.members.filter(m => m.user.toString() !== targetId);
    await board.save();

    const io = getIO();
    if (io) io.to(`board:${board._id}`).emit('member:removed', { userId: targetId });

    res.json({ success: true, data: { message: 'Member removed' } });
  } catch (err) { next(err); }
});

// PATCH /api/boards/:id/members/:userId
router.patch('/:id/members/:userId', authenticate, isBoardAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid role' } });
    }
    const board = req.board;
    const member = board.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
    if (member.role === 'owner') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot change owner role' } });

    member.role = role;
    await board.save();
    res.json({ success: true, data: { message: 'Role updated' } });
  } catch (err) { next(err); }
});

// GET /api/boards/:id/activity
router.get('/:id/activity', authenticate, isBoardMember, async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const query = { board: req.params.id };
    if (cursor) query._id = { $lt: cursor };

    const activities = await Activity.find(query)
      .populate('actor', 'name email avatarUrl')
      .populate('task', 'title')
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1);

    const hasMore = activities.length > parseInt(limit);
    const results = hasMore ? activities.slice(0, -1) : activities;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    res.json({ success: true, data: { activities: results, nextCursor, hasMore } });
  } catch (err) { next(err); }
});

// GET /api/boards/:id/analytics
router.get('/:id/analytics', authenticate, isBoardMember, async (req, res, next) => {
  try {
    const boardId = req.params.id;
    const [byStatus, overdue, allTasks] = await Promise.all([
      Task.aggregate([
        { $match: { board: require('mongoose').Types.ObjectId.createFromHexString(boardId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({ board: boardId, dueDate: { $lt: new Date() }, status: { $ne: 'done' } }),
      Task.find({ board: boardId }).select('status priority assignedTo createdAt updatedAt dueDate progress'),
    ]);

    const stats = { todo: 0, in_progress: 0, review: 0, done: 0 };
    byStatus.forEach(s => { stats[s._id] = s.count; });

    res.json({
      success: true,
      data: { byStatus: stats, overdue, total: allTasks.length, tasks: allTasks },
    });
  } catch (err) { next(err); }
});

// GET /api/boards/:boardId/messages - get team messages
router.get('/:boardId/messages', authenticate, isBoardMember, async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;
    const messages = await Message.find({ board: boardId })
      .populate('sender', 'name email avatarUrl')
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({ success: true, data: { messages } });
  } catch (err) { next(err); }
});

// POST /api/boards/:boardId/messages - send team message
router.post('/:boardId/messages', authenticate, isBoardMember, async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'text required' } });
    }

    const message = await Message.create({
      board: boardId,
      sender: req.user._id,
      text: text.trim(),
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email avatarUrl');

    const io = getIO();
    if (io) {
      io.to(`board:${boardId}`).emit('message:new', { message: populated });
    }

    res.status(201).json({ success: true, data: { message: populated } });
  } catch (err) { next(err); }
});

module.exports = router;
