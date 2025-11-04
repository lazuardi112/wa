const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  instanceId: { type: String, required: true, unique: true }, // Unique ID for the Baileys instance
  remark: { type: String }, // e.g., "WA Kantor"
  status: {
    type: String,
    enum: ['uninitialized', 'connecting', 'connected', 'disconnected', 'waiting_qr'],
    default: 'uninitialized',
  },
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
