import mongoose from 'mongoose';

const browserActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true },
    title: { type: String },
    visitedAt: { type: Date, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const BrowserActivity = mongoose.model('BrowserActivity', browserActivitySchema);

export default BrowserActivity;

browserActivitySchema.index({ userId: 1 });
browserActivitySchema.index({ visitedAt: -1 });
