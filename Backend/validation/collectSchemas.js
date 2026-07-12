import { z } from 'zod';

const screenTimeEntry = z.object({ date: z.string().optional(), totalSeconds: z.number().nonnegative().optional(), perApp: z.record(z.number()).optional() });
const appUsageEntry = z.object({ packageName: z.string(), displayName: z.string().optional(), startTime: z.string(), endTime: z.string(), seconds: z.number().nonnegative().optional(), meta: z.record(z.any()).optional() });
const notificationEntry = z.object({ app: z.string().optional(), title: z.string().optional(), text: z.string().optional(), receivedAt: z.string().optional(), meta: z.record(z.any()).optional() });
const imageEntry = z.object({ uri: z.string().optional(), detectedObjects: z.record(z.any()).optional(), capturedAt: z.string().optional(), meta: z.record(z.any()).optional() });
const browserEntry = z.object({ url: z.string().url(), title: z.string().optional(), visitedAt: z.string().optional(), meta: z.record(z.any()).optional() });

export const collectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('screen_time'),
    payload: z.union([z.array(screenTimeEntry), screenTimeEntry]),
  }),
  z.object({
    type: z.literal('app_usage'),
    payload: z.union([z.array(appUsageEntry), appUsageEntry]),
  }),
  z.object({
    type: z.literal('notification'),
    payload: z.union([z.array(notificationEntry), notificationEntry]),
  }),
  z.object({
    type: z.literal('image'),
    payload: z.union([z.array(imageEntry), imageEntry]),
  }),
  z.object({
    type: z.literal('browser_activity'),
    payload: z.union([z.array(browserEntry), browserEntry]),
  }),
]);
