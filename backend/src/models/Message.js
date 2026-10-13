const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

messageSchema.index({ board: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
