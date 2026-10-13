const express = require('express');
const router = express.Router();
const path = require('path');
const Task = require('../models/Task');
const Board = require('../models/Board');
const Comment = require('../models/Comment');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { logActivity } = require('../services/activityService');
const { calcPositionForIndex, rebalanceColumn, getEndPosition } = require('../services/positionService');
const { getIO } = require('../sockets');
const { v4: uuidv4 } = require('uuid');

// Idempotency store (in-memory, use Redis in production)
const processedMutations = new Map();
const MUTATION_TTL = 5 * 60 * 1000;

const checkIdempotency = (clientMutationId) => {
  if (!clientMutationId) return false;
  if (processedMutations.has(clientMutationId)) return true;
  processedMutations.set(clientMutationId, Date.now());
  setTimeout(() => processedMutations.delete(clientMutationId), MUTATION_TTL);
  return false;
};

// Helper: get board membership for a user
const getMembership = async (boardId, userId) => {
  const board = await Board.findById(boardId).select('members');
  if (!board) return null;
  return board.members.find(m => m.user.toString() === userId.toString());
};

// POST /api/tasks or /boards/:boardId/tasks - create task
router.post(['/', '/boards/:boardId/tasks'], authenticate, async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.body.boardId || req.body.board;
    if (!boardId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'boardId required' } });
    const membership = await getMembership(boardId, req.user._id);
    if (!membership) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a board member' } });
    if (membership.role === 'viewer') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Viewers cannot create tasks' } });

    const { title, description, priority, dueDate, assignedTo, status = 'todo', subtasks, clientMutationId } = req.body;
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'title required' } });

    if (clientMutationId && checkIdempotency(clientMutationId)) {
      return res.status(200).json({ success: true, data: { duplicate: true } });
    }

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

// PATCH /api/tasks/:taskId - update
router.patch('/:taskId', authenticate, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { version, clientMutationId, ...updates } = req.body;

    if (clientMutationId && checkIdempotency(clientMutationId)) {
      return res.status(200).json({ success: true, data: { duplicate: true } });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const membership = await getMembership(task.board, req.user._id);
    if (!membership) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a board member' } });
    if (membership.role === 'viewer') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Viewers cannot edit tasks' } });

    // Optimistic concurrency
    if (version !== undefined && task.version !== version) {
      const latest = await Task.findById(taskId).populate('assignedTo', 'name email avatarUrl');
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Task was updated by someone else' },
        data: { latestTask: latest },
      });
    }

    const allowed = ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'status', 'progress', 'subtasks'];
    const updateData = { $inc: { version: 1 } };
    const setData = {};
    allowed.forEach(f => { if (updates[f] !== undefined) setData[f] = updates[f]; });
    updateData.$set = setData;

    // Auto-calc progress from subtasks
    if (updates.subtasks && updates.subtasks.length > 0) {
      const done = updates.subtasks.filter(s => s.done).length;
      setData.progress = Math.round((done / updates.subtasks.length) * 100);
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, { new: true })
      .populate('assignedTo', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl');

    const changedFields = Object.keys(setData);
    await logActivity({
      boardId: task.board,
      taskId,
      actorId: req.user._id,
      type: 'task_updated',
      meta: { changedFields, title: task.title },
    });

    const io = getIO();
    if (io) {
      io.to(`board:${task.board}`).emit('task:updated', {
        task: updatedTask,
        clientMutationId,
        actorId: req.user._id.toString(),
      });
    }

    res.json({ success: true, data: { task: updatedTask } });
  } catch (err) { next(err); }
});

// PATCH /api/tasks/:taskId/move
router.patch('/:taskId/move', authenticate, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { toStatus, toIndex, version, clientMutationId } = req.body;

    if (clientMutationId && checkIdempotency(clientMutationId)) {
      return res.status(200).json({ success: true, data: { duplicate: true } });
    }

    const VALID_STATUSES = ['todo', 'in_progress', 'review', 'done'];
    if (!VALID_STATUSES.includes(toStatus)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid status' } });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const membership = await getMembership(task.board, req.user._id);
    if (!membership) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a board member' } });
    if (membership.role === 'viewer') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Viewers cannot move tasks' } });

    // Optimistic concurrency check
    if (version !== undefined && task.version !== version) {
      const latest = await Task.findById(taskId).populate('assignedTo', 'name email avatarUrl');
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Task version mismatch' },
        data: { latestTask: latest },
      });
    }

    const fromStatus = task.status;
    const { position, needsRebalance } = await calcPositionForIndex(
      task.board, toStatus, toIndex !== undefined ? toIndex : 9999, taskId
    );

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: { status: toStatus, position }, $inc: { version: 1 } },
      { new: true }
    ).populate('assignedTo', 'name email avatarUrl').populate('createdBy', 'name email avatarUrl');

    await logActivity({
      boardId: task.board,
      taskId,
      actorId: req.user._id,
      type: 'task_moved',
      meta: { from: fromStatus, to: toStatus, title: task.title },
    });

    const io = getIO();
    if (io) {
      io.to(`board:${task.board}`).emit('task:moved', {
        task: updatedTask,
        fromStatus,
        toStatus,
        clientMutationId,
        actorId: req.user._id.toString(),
      });

      if (needsRebalance) {
        const rebalanced = await rebalanceColumn(task.board, toStatus);
        io.to(`board:${task.board}`).emit('column:rebalanced', { status: toStatus, positions: rebalanced });
      }
    }

    res.json({ success: true, data: { task: updatedTask, needsRebalance } });
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:taskId
router.delete('/:taskId', authenticate, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const membership = await getMembership(task.board, req.user._id);
    if (!membership) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a board member' } });
    if (membership.role === 'viewer') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Viewers cannot delete tasks' } });

    const boardId = task.board.toString();
    const taskTitle = task.title;
    await Task.findByIdAndDelete(req.params.taskId);

    await logActivity({ boardId, taskId: req.params.taskId, actorId: req.user._id, type: 'task_deleted', meta: { title: taskTitle } });

    const io = getIO();
    if (io) {
      io.to(`board:${boardId}`).emit('task:deleted', {
        taskId: req.params.taskId,
        actorId: req.user._id.toString(),
      });
    }

    res.json({ success: true, data: { message: 'Task deleted' } });
  } catch (err) { next(err); }
});

// POST /api/tasks/:taskId/attachments
router.post('/:taskId/attachments', authenticate, upload.array('files', 5), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const membership = await getMembership(task.board, req.user._id);
    if (!membership || membership.role === 'viewer') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'No files uploaded' } });
    }

    const attachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/${req.params.taskId}/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user._id,
    }));

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $push: { attachments: { $each: attachments } }, $inc: { version: 1 } },
      { new: true }
    ).populate('assignedTo', 'name email avatarUrl');

    await logActivity({
      boardId: task.board,
      taskId: task._id,
      actorId: req.user._id,
      type: 'file_uploaded',
      meta: { count: attachments.length, title: task.title },
    });

    const io = getIO();
    if (io) io.to(`board:${task.board}`).emit('task:updated', { task: updatedTask, actorId: req.user._id.toString() });

    res.json({ success: true, data: { attachments, task: updatedTask } });
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:taskId/attachments/:attachmentId
router.delete('/:taskId/attachments/:attachmentId', authenticate, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const membership = await getMembership(task.board, req.user._id);
    if (!membership || membership.role === 'viewer') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $pull: { attachments: { _id: req.params.attachmentId } }, $inc: { version: 1 } },
      { new: true }
    );

    res.json({ success: true, data: { task: updatedTask } });
  } catch (err) { next(err); }
});

// GET /api/tasks/:taskId/comments
router.get('/:taskId/comments', authenticate, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const membership = await getMembership(task.board, req.user._id);
    if (!membership) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a board member' } });

    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { comments } });
  } catch (err) { next(err); }
});

// POST /api/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'text required' } });

    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const membership = await getMembership(task.board, req.user._id);
    if (!membership || membership.role === 'viewer') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    const comment = await Comment.create({
      task: req.params.taskId,
      board: task.board,
      author: req.user._id,
      text,
    });

    await Task.findByIdAndUpdate(req.params.taskId, { $inc: { commentCount: 1 } });

    const populated = await Comment.findById(comment._id).populate('author', 'name email avatarUrl');

    await logActivity({ boardId: task.board, taskId: task._id, actorId: req.user._id, type: 'comment_added', meta: { title: task.title } });

    const io = getIO();
    if (io) {
      io.to(`board:${task.board}`).emit('comment:new', { comment: populated, taskId: req.params.taskId });
    }

    res.status(201).json({ success: true, data: { comment: populated } });
  } catch (err) { next(err); }
});

module.exports = router;
