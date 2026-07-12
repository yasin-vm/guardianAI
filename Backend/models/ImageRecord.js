import mongoose from 'mongoose';

const imageRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uri: { type: String },
    detectedObjects: { type: mongoose.Schema.Types.Mixed, default: {} },
    capturedAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const ImageRecord = mongoose.model('ImageRecord', imageRecordSchema);

export default ImageRecord;

imageRecordSchema.index({ userId: 1 });
imageRecordSchema.index({ capturedAt: -1 });
