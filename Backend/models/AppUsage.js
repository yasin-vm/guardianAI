import mongoose from 'mongoose';

const appUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    packageName: { type: String, required: true },
    displayName: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    seconds: { type: Number, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const AppUsage = mongoose.model('AppUsage', appUsageSchema);

export default AppUsage;

appUsageSchema.index({ userId: 1 });
appUsageSchema.index({ startTime: -1 });
