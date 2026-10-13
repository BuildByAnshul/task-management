const Activity = require('../models/Activity');
const Board = require('../models/Board');
const { getIO } = require('../sockets');

const logActivity = async ({ boardId, taskId, actorId, type, meta = {} }) => {
  try {
    const activity = await Activity.create({
      board: boardId,
      task: taskId || null,
      actor: actorId,
      type,
      meta,
    });

    // Increment board version
    const board = await Board.findByIdAndUpdate(
      boardId,
      { $inc: { boardVersion: 1 }, $set: { lastEventId: activity._id.toString() } },
      { new: true }
    );

    // Emit to socket room
    const io = getIO();
    if (io) {
      const populated = await Activity.findById(activity._id)
        .populate('actor', 'name email avatarUrl')
        .populate('task', 'title');
      
      io.to(`board:${boardId}`).emit('activity:new', {
        activity: populated,
        boardVersion: board.boardVersion,
      });
    }

    return activity;
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

module.exports = { logActivity };
