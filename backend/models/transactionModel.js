const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  orderId: { type: String, required: true, unique: true }, // From Midtrans or internal unique ID
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'expired'],
    default: 'pending',
  },
  paymentGatewayData: { type: Object }, // To store the notification response from Midtrans
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
