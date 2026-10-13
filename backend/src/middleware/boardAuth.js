const Board = require('../models/Board');

// Check if user is a board member
const isBoardMember = async (req, res, next) => {
  try {
    const boardId = req.params.id || req.params.boardId || req.body.board;
    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Board not found' },
      });
    }

    const membership = board.members.find(m => m.user.toString() === req.user._id.toString());
    
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not a board member' },
      });
    }

    req.board = board;
    req.memberRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};

// Check if user is board owner or admin
const isBoardAdmin = async (req, res, next) => {
  try {
    const boardId = req.params.id || req.params.boardId;
    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Board not found' },
      });
    }

    const membership = board.members.find(m => m.user.toString() === req.user._id.toString());
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    req.board = board;
    req.memberRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};

// Check if user is board owner
const isBoardOwner = async (req, res, next) => {
  try {
    const boardId = req.params.id || req.params.boardId;
    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Board not found' },
      });
    }

    const membership = board.members.find(m => m.user.toString() === req.user._id.toString());
    
    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only board owner can perform this action' },
      });
    }

    req.board = board;
    req.memberRole = 'owner';
    next();
  } catch (err) {
    next(err);
  }
};

// Check viewer cannot mutate
const canMutate = (req, res, next) => {
  if (req.memberRole === 'viewer') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Viewers cannot perform this action' },
    });
  }
  next();
};

module.exports = { isBoardMember, isBoardAdmin, isBoardOwner, canMutate };
