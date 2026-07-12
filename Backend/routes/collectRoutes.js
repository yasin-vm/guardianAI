import express from 'express';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { collectSchema } from '../validation/collectSchemas.js';
import { collect } from '../controllers/collectController.js';

const router = express.Router();

router.post('/', protect, validate(collectSchema), collect);

export default router;
