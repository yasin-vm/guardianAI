import { z } from 'zod';

const screenTimeEntry = z.object({ date: z.string().optional(), totalSeconds: z.number().nonnegative().optional(), perApp: z.record(z.number()).optional() });
const appUsageEntry = z.object({ packageName: z.string(), displayName: z.string().optional(), startTime: z.string(), endTime: z.string(), seconds: z.number().nonnegative().optional(), meta: z.record(z.any()).optional() });
const notificationEntry = z.object({ app: z.string().optional(), title: z.string().optional(), text: z.string().optional(), receivedAt: z.string().optional(), meta: z.record(z.any()).optional() });
const imageEntry = z.object({ uri: z.string().optional(), detectedObjects: z.record(z.any()).optional(), capturedAt: z.string().optional(), meta: z.record(z.any()).optional() });
const browserEntry = z.object({ url: z.string().url(), title: z.string().optional(), visitedAt: z.string().optional(), meta: z.record(z.any()).optional() });

export const collectSchema = z.object({
  type: z.enum(['screen_time', 'app_usage', 'notification', 'image', 'browser_activity']),
  payload: z.union([
    z.array(screenTimeEntry),
    z.array(appUsageEntry),
    z.array(notificationEntry),
    z.array(imageEntry),
    z.array(browserEntry),
    screenTimeEntry,
    appUsageEntry,
    notificationEntry,
    imageEntry,
    browserEntry,
  ]),
});
