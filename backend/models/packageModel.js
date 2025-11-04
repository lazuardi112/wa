const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "Free", "Basic", "Pro"
  price: { type: Number, required: true, default: 0 },
  durationDays: { type: Number, required: true, default: 30 }, // Subscription duration in days
  maxDevices: { type: Number, required: true, default: 1 },
  apiAccess: { type: Boolean, required: true, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
