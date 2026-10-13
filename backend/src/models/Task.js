const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false },
}, { _id: true });

const attachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const taskSchema = new mongoose.Schema({
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 500 },
  description: { type: String, default: '', maxlength: 5000 },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date, default: null },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo',
  },
  position: { type: Number, required: true, default: 1000 },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  subtasks: [subtaskSchema],
  attachments: [attachmentSchema],
  commentCount: { type: Number, default: 0 },
  version: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Compound indexes
taskSchema.index({ board: 1, status: 1, position: 1 });
taskSchema.index({ board: 1, assignedTo: 1 });
taskSchema.index({ board: 1, dueDate: 1 });
taskSchema.index({ board: 1, updatedAt: -1 });

// Auto-calc progress from subtasks when subtasks change
taskSchema.pre('save', function () {
  if (this.subtasks && this.subtasks.length > 0) {
    const done = this.subtasks.filter(s => s.done).length;
    this.progress = Math.round((done / this.subtasks.length) * 100);
  }
});

module.exports = mongoose.model('Task', taskSchema);
