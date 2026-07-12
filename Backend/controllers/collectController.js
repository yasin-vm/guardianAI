import AppUsage from '../models/AppUsage.js';
import ScreenTime from '../models/ScreenTime.js';
import Notification from '../models/Notification.js';
import ImageRecord from '../models/ImageRecord.js';
import BrowserActivity from '../models/BrowserActivity.js';

export async function collect(req, res, next) {
  try {
    const { type, payload } = req.body;
    if (!type || !payload) return res.status(400).json({ message: 'type and payload are required' });

    switch (type) {
      case 'screen_time': {
        const entries = Array.isArray(payload) ? payload : [payload];
        const docs = entries.map((e) => ({ userId: req.user._id, date: e.date || new Date(), totalSeconds: e.totalSeconds || 0, perApp: e.perApp || {} }));
        await ScreenTime.insertMany(docs);
        return res.json({ stored: docs.length });
      }
      case 'app_usage': {
        const entries = Array.isArray(payload) ? payload : [payload];
        const docs = entries.map((e) => ({ userId: req.user._id, packageName: e.packageName, displayName: e.displayName, startTime: e.startTime, endTime: e.endTime, seconds: e.seconds || 0, meta: e.meta || {} }));
        await AppUsage.insertMany(docs);
        return res.json({ stored: docs.length });
      }
      case 'notification': {
        const entries = Array.isArray(payload) ? payload : [payload];
        const docs = entries.map((e) => ({ userId: req.user._id, app: e.app, title: e.title, text: e.text, receivedAt: e.receivedAt || new Date(), meta: e.meta || {} }));
        await Notification.insertMany(docs);
        return res.json({ stored: docs.length });
      }
      case 'image': {
        const entries = Array.isArray(payload) ? payload : [payload];
        const docs = entries.map((e) => ({ userId: req.user._id, uri: e.uri, detectedObjects: e.detectedObjects || {}, capturedAt: e.capturedAt || new Date(), meta: e.meta || {} }));
        await ImageRecord.insertMany(docs);
        return res.json({ stored: docs.length });
      }
      case 'browser_activity': {
        const entries = Array.isArray(payload) ? payload : [payload];
        const docs = entries.map((e) => ({ userId: req.user._id, url: e.url, title: e.title || '', visitedAt: e.visitedAt || new Date(), meta: e.meta || {} }));
        await BrowserActivity.insertMany(docs);
        return res.json({ stored: docs.length });
      }
      default:
        return res.status(400).json({ message: 'Unknown type' });
    }
  } catch (error) {
    next(error);
  }
}
