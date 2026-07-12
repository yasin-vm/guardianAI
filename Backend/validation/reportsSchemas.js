import { z } from 'zod';

export const periodSchema = z.object({ period: z.enum(['daily', 'weekly', 'monthly']) });
