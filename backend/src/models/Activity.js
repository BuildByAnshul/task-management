const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['task_created', 'task_moved', 'task_updated', 'task_deleted', 'member_joined', 'comment_added', 'file_uploaded', 'board_created'],
    required: true,
  },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

activitySchema.index({ board: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
