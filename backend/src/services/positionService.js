const Task = require('../models/Task');

const EPSILON = 0.001; // minimum gap before rebalance

/**
 * Calculate position for a new task between prev and next
 */
const calcPosition = (prevPos, nextPos) => {
  if (prevPos === null && nextPos === null) return 1000;
  if (prevPos === null) return nextPos / 2;
  if (nextPos === null) return prevPos + 1000;
  return (prevPos + nextPos) / 2;
};

/**
 * Get tasks for a column sorted by position
 */
const getColumnTasks = async (boardId, status) => {
  return Task.find({ board: boardId, status }).sort({ position: 1 });
};

/**
 * Calculate position for inserting at a specific index in a column
 */
const calcPositionForIndex = async (boardId, status, toIndex, excludeTaskId = null) => {
  let tasks = await getColumnTasks(boardId, status);
  if (excludeTaskId) {
    tasks = tasks.filter(t => t._id.toString() !== excludeTaskId.toString());
  }

  const clampedIndex = Math.max(0, Math.min(toIndex, tasks.length));

  const prev = tasks[clampedIndex - 1] || null;
  const next = tasks[clampedIndex] || null;

  const prevPos = prev ? prev.position : null;
  const nextPos = next ? next.position : null;

  const position = calcPosition(prevPos, nextPos);

  // Check if rebalance needed
  if (prevPos !== null && nextPos !== null && Math.abs(nextPos - prevPos) < EPSILON) {
    return { position, needsRebalance: true };
  }

  return { position, needsRebalance: false };
};

/**
 * Rebalance all tasks in a column with even spacing
 */
const rebalanceColumn = async (boardId, status) => {
  const tasks = await getColumnTasks(boardId, status);
  const GAP = 1000;
  
  const updates = tasks.map((task, idx) => ({
    updateOne: {
      filter: { _id: task._id },
      update: { $set: { position: (idx + 1) * GAP } },
    },
  }));

  if (updates.length > 0) {
    await Task.bulkWrite(updates);
  }

  return tasks.map((t, idx) => ({ taskId: t._id, position: (idx + 1) * GAP }));
};

/**
 * Get position for appending at end of column
 */
const getEndPosition = async (boardId, status) => {
  const last = await Task.findOne({ board: boardId, status })
    .sort({ position: -1 })
    .select('position');
  return last ? last.position + 1000 : 1000;
};

module.exports = { calcPosition, calcPositionForIndex, rebalanceColumn, getColumnTasks, getEndPosition };
