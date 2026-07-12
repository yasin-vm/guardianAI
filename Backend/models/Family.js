import mongoose from 'mongoose';

const familySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    childIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Family = mongoose.model('Family', familySchema);

export default Family;
