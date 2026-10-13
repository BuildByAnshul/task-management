const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const inviteSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  token: { type: String, required: true },
  role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
}, { _id: true });

const columnConfigSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String, required: true },
  dotColor: { type: String, required: true },
}, { _id: false });

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 2000 },
  clientName: { type: String, default: '', trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'completed', 'archived'],
    default: 'planning',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [memberSchema],
  invites: [inviteSchema],
  columns: {
    type: [columnConfigSchema],
    default: [
      { key: 'todo', label: 'To Do', color: '#FDE8EF', dotColor: '#F472B6' },
      { key: 'in_progress', label: 'In Progress', color: '#FEF0E7', dotColor: '#FB923C' },
      { key: 'review', label: 'In Review', color: '#E0F2FE', dotColor: '#38BDF8' },
      { key: 'done', label: 'Completed', color: '#EDE9FE', dotColor: '#A78BFA' },
    ],
  },
  boardVersion: { type: Number, default: 0 },
  lastEventId: { type: String, default: null },
}, { timestamps: true });

boardSchema.index({ 'members.user': 1 });
boardSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Board', boardSchema);
