import mongoose from 'mongoose';

const alertsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: { type: String, required: true },
    level: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Alerts = mongoose.model('Alerts', alertsSchema);

export default Alerts;
