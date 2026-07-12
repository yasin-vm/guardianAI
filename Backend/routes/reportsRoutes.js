import express from 'express';
import protect from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';
import ScreenTime from '../models/ScreenTime.js';
import AppUsage from '../models/AppUsage.js';
import Notification from '../models/Notification.js';
import BrowserActivity from '../models/BrowserActivity.js';
import Family from '../models/Family.js';
import User from '../models/User.js';
import validate from '../middleware/validate.js';
import { periodSchema } from '../validation/reportsSchemas.js';

const router = express.Router();

// Helper middleware to check child access permissions
const checkChildAccess = async (req, res, next) => {
  const childId = req.params.childId;
  if (!childId) return res.status(400).json({ message: 'Child ID is required.' });

  if (req.user.role === 'child' && req.user._id.toString() !== childId) {
    return res.status(403).json({ message: 'Forbidden: You cannot access other children\'s data.' });
  }

  if (req.user.role === 'parent') {
    const childUser = await User.findById(childId);
    if (!childUser || childUser.parentId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: This child is not linked to your account.' });
    }
  }

  next();
};

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

// GET detailed dashboard for a specific child
router.get('/child/:childId/dashboard', protect, checkChildAccess, async (req, res) => {
  try {
    const { childId } = req.params;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Fetch today's screen time (merge multiple telemetry entries if any exist)
    const screenTimeRecords = await ScreenTime.find({
      userId: childId,
      date: { $gte: startOfToday }
    });
    let totalScreenSeconds = 0;
    const perApp = {};
    screenTimeRecords.forEach((rec) => {
      totalScreenSeconds += rec.totalSeconds || 0;
      if (rec.perApp) {
        for (const [app, sec] of Object.entries(rec.perApp)) {
          perApp[app] = (perApp[app] || 0) + Number(sec || 0);
        }
      }
    });

    // 2. Fetch today's detailed app usage events
    const appUsages = await AppUsage.find({
      userId: childId,
      startTime: { $gte: startOfToday }
    }).sort({ seconds: -1 });

    // 3. Fetch today's notifications
    const notifications = await Notification.find({
      userId: childId,
      receivedAt: { $gte: startOfToday }
    }).sort({ receivedAt: -1 });

    // 4. Fetch today's web browser logs
    const browserActivity = await BrowserActivity.find({
      userId: childId,
      visitedAt: { $gte: startOfToday }
    }).sort({ visitedAt: -1 });

    // 5. Fetch recent child logs
    const logs = await ActivityLog.find({
      userId: childId
    }).sort({ createdAt: -1 }).limit(20);

    // 6. Fetch family limits for the child
    const parentId = req.user.role === 'parent' ? req.user._id : req.user.parentId;
    const family = await Family.findOne({ parentId });
    const settings = family ? family.settings : {};
    const childLimits = (settings && settings.limits && settings.limits[childId]) || {
      screenTimeLimitMinutes: 120, // default 2 hours
      bedtimeEnabled: false,
      bedtimeStart: '21:00',
      bedtimeEnd: '07:00'
    };

    res.json({
      childId,
      totalScreenSeconds,
      perApp: perApp || {},
      appUsages,
      notificationsCount: notifications.length,
      notifications,
      browserActivity,
      logs,
      settings: childLimits
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch child dashboard data.', error: error.message });
  }
});

// GET historical reports trend per-child
router.get('/child/:childId/history/:period', protect, checkChildAccess, validate(periodSchema), async (req, res) => {
  try {
    const { childId, period } = req.params;
    const now = new Date();
    let daysToFetch = 7;
    if (period === 'weekly') daysToFetch = 30;
    if (period === 'monthly') daysToFetch = 90;

    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToFetch);

    // 1. Screen time logs in period
    const screenTimeHistory = await ScreenTime.find({
      userId: childId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    // 2. App usage metrics
    const appUsagesHistory = await AppUsage.find({
      userId: childId,
      startTime: { $gte: startDate }
    });

    const appUsageSummary = {};
    appUsagesHistory.forEach((u) => {
      const name = u.displayName || u.packageName;
      appUsageSummary[name] = (appUsageSummary[name] || 0) + u.seconds;
    });

    // 3. Notification logs
    const notificationsHistory = await Notification.find({
      userId: childId,
      receivedAt: { $gte: startDate }
    });
    const notificationAppCounts = {};
    notificationsHistory.forEach((n) => {
      const appName = n.app || 'Unknown';
      notificationAppCounts[appName] = (notificationAppCounts[appName] || 0) + 1;
    });

    // 4. Browser activity history
    const browserHistory = await BrowserActivity.find({
      userId: childId,
      visitedAt: { $gte: startDate }
    }).sort({ visitedAt: -1 }).limit(100);

    res.json({
      childId,
      period,
      screenTimeHistory,
      appUsageSummary,
      notificationAppCounts,
      browserHistoryCount: browserHistory.length,
      browserHistory
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch child history reports.', error: error.message });
  }
});

// GET family rules / settings
router.get('/family/settings', protect, async (req, res) => {
  try {
    const parentId = req.user.role === 'parent' ? req.user._id : req.user.parentId;
    const family = await Family.findOne({ parentId });
    if (!family) {
      return res.status(404).json({ message: 'Family not found.' });
    }
    res.json(family.settings || {});
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch family settings.', error: error.message });
  }
});

// POST update family settings (parents only)
router.post('/family/settings', protect, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can modify family settings.' });
    }
    const family = await Family.findOne({ parentId: req.user._id });
    if (!family) {
      return res.status(404).json({ message: 'Family not found.' });
    }

    family.settings = req.body;
    await family.save();
    res.json({ message: 'Family settings updated successfully.', settings: family.settings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update family settings.', error: error.message });
  }
});

export default router;
