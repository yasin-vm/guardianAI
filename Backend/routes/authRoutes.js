import express from 'express';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { signupSchema, loginSchema, linkFamilySchema } from '../validation/authSchemas.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/link-family', protect, validate(linkFamilySchema), authController.linkFamily);
router.get('/family', protect, authController.getFamily);
router.get('/me', protect, authController.me);

export default router;
