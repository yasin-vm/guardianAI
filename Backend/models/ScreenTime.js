import mongoose from 'mongoose';

const screenTimeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    totalSeconds: { type: Number, default: 0 },
    perApp: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const ScreenTime = mongoose.model('ScreenTime', screenTimeSchema);

export default ScreenTime;

screenTimeSchema.index({ userId: 1 });
screenTimeSchema.index({ date: -1 });
