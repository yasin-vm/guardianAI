import express from 'express';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category, severity } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'A title is required.' });
    }

    const log = await ActivityLog.create({
      userId: req.user._id,
      role: req.user.role,
      title,
      description,
      category,
      severity,
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create activity log.', error: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'parent') {
      const children = await User.find({ parentId: req.user._id }).select('_id');
      const childIds = children.map((child) => child._id);

      const logs = await ActivityLog.find({
        $or: [{ userId: req.user._id }, { userId: { $in: childIds } }],
      })
        .populate('userId', 'name role')
        .sort({ createdAt: -1 });

      return res.json(logs);
    }

    const logs = await ActivityLog.find({ userId: req.user._id })
      .populate('userId', 'name role')
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activity logs.', error: error.message });
  }
});

export default router;
