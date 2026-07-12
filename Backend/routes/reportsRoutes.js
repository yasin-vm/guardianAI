import express from 'express';
import protect from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';
import ScreenTime from '../models/ScreenTime.js';
import validate from '../middleware/validate.js';
import { periodSchema } from '../validation/reportsSchemas.js';

const router = express.Router();

// Recent activities (for the signed-in user or parent seeing family activities)
router.get('/activities/recent', protect, async (req, res) => {
  try {
    if (req.user.role === 'parent') {
      // include parent's and children's logs
      const children = await (await req.user.constructor.find({ parentId: req.user._id })).map((c) => c._id);
      const logs = await ActivityLog.find({ $or: [{ userId: req.user._id }, { userId: { $in: children } }] })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('userId', 'name role');
      return res.json(logs);
    }

    const logs = await ActivityLog.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).populate('userId', 'name role');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch recent activities', error: error.message });
  }
});

// Parent dashboard statistics
router.get('/stats/parent', protect, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ message: 'Forbidden' });

    const children = await req.user.constructor.find({ parentId: req.user._id }).select('_id');
    const childIds = children.map((c) => c._id);

    const recentCount = await ActivityLog.countDocuments({ userId: { $in: [req.user._id, ...childIds] } });
    const childCount = childIds.length;
    const screenTime = await ScreenTime.aggregate([
      { $match: { userId: { $in: childIds } } },
      { $group: { _id: null, totalSeconds: { $sum: '$totalSeconds' } } },
    ]);

    res.json({ recentCount, childCount, totalChildScreenSeconds: (screenTime[0] && screenTime[0].totalSeconds) || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to compute parent stats', error: error.message });
  }
});

// Summaries: daily/weekly/monthly for signed-in user
router.get('/summary/:period', protect, validate(periodSchema), async (req, res) => {
  try {
    const { period } = req.params;
    const valid = ['daily', 'weekly', 'monthly'];
    if (!valid.includes(period)) return res.status(400).json({ message: 'Invalid period' });

    // very simple summary: count of activities and total screen time in period
    const now = new Date();
    let start;
    if (period === 'daily') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'weekly') {
      const diff = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    }
    if (period === 'monthly') start = new Date(now.getFullYear(), now.getMonth(), 1);

    const activityCount = await ActivityLog.countDocuments({ userId: req.user._id, createdAt: { $gte: start } });
    const screen = await ScreenTime.aggregate([
      { $match: { userId: req.user._id, date: { $gte: start } } },
      { $group: { _id: null, totalSeconds: { $sum: '$totalSeconds' } } },
    ]);

    res.json({ period, activityCount, totalScreenSeconds: (screen[0] && screen[0].totalSeconds) || 0, since: start });
  } catch (error) {
    res.status(500).json({ message: 'Failed to compute summary', error: error.message });
  }
});

export default router;
