import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Family from '../models/Family.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    const parents = await User.find({ role: 'parent' });
    for (const p of parents) {
      const existing = await Family.findOne({ parentId: p._id });
      if (!existing) {
        let code;
        do {
          code = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (await Family.findOne({ code }));

        const f = await Family.create({ code, parentId: p._id, childIds: [] });
        console.log(`Created family ${f.code} for parent ${p._id}`);
      } else {
        console.log(`Family exists for parent ${p._id}: ${existing.code}`);
      }
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
};

run();
