import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Family from '../models/Family.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const generateUniqueFamilyCode = async () => {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (await Family.findOne({ code }));
  return code;
};

const normalizeChildId = (childId) => {
  if (!childId) return null;

  if (typeof childId === 'string' && mongoose.Types.ObjectId.isValid(childId)) {
    return childId;
  }

  if (childId instanceof mongoose.Types.ObjectId) {
    return childId.toHexString();
  }

  if (childId._id && mongoose.Types.ObjectId.isValid(String(childId._id))) {
    return String(childId._id);
  }

  if (childId?.toHexString && typeof childId.toHexString === 'function') {
    const value = childId.toHexString();
    return mongoose.Types.ObjectId.isValid(value) ? value : null;
  }

  return null;
};

const reconcileFamilyChildren = async (family) => {
  if (!family) return family;
  const children = await User.find({ parentId: family.parentId }).select('-password');
  const childIds = children.map((child) => child._id.toString());
  family.childIds = childIds.map((id) => new mongoose.Types.ObjectId(id));
  await family.save();
  return family;
};

export async function signup(req, res, next) {
  try {
    const { name, email, password, role, familyCode } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists.' });

    if (role === 'child') {
      if (!familyCode || typeof familyCode !== 'string' || !familyCode.trim()) {
        return res.status(400).json({ message: 'Invalid Family Code.' });
      }

      const family = await Family.findOne({ code: familyCode.trim().toUpperCase() });
      if (!family) {
        return res.status(400).json({ message: 'Invalid Family Code.' });
      }

      const user = await User.create({ name, email, password, role, parentId: family.parentId });
      const existingIds = (family.childIds || [])
        .map((id) => normalizeChildId(id))
        .filter(Boolean);
      const combinedIds = Array.from(new Set([...existingIds, user._id.toString()]));
      family.childIds = combinedIds.map((id) => new mongoose.Types.ObjectId(id));
      await family.save();

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        familyCode: family.code,
        parentId: user.parentId,
        token: generateToken(user._id),
      });
    }

    const user = await User.create({ name, email, password, role });

    if (role === 'parent') {
      const code = await generateUniqueFamilyCode();
      const family = await Family.create({ code, parentId: user._id, childIds: [] });
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        familyCode: family.code,
        token: generateToken(user._id),
      });
    }

    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password.' });

    let familyCode = null;
    if (user.role === 'parent') {
      const family = await Family.findOne({ parentId: user._id });
      familyCode = family?.code ?? null;
    } else if (user.parentId) {
      const family = await Family.findOne({ parentId: user.parentId });
      familyCode = family?.code ?? null;
    }

    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, familyCode, token: generateToken(user._id) });
  } catch (error) {
    next(error);
  }
}

export async function linkFamily(req, res, next) {
  try {
    const { familyCode } = req.body;
    if (!familyCode) return res.status(400).json({ message: 'Family code is required.' });
    if (req.user.role !== 'child') return res.status(400).json({ message: 'Only child accounts can link to a family.' });

    const family = await Family.findOne({ code: familyCode });
    if (!family) return res.status(400).json({ message: 'Invalid family code.' });

    req.user.parentId = family.parentId;
    await req.user.save();

    const existingIds = (family.childIds || [])
      .map((id) => normalizeChildId(id))
      .filter(Boolean);
    const combinedIds = Array.from(new Set([...existingIds, req.user._id.toString()]));
    family.childIds = combinedIds.map((id) => new mongoose.Types.ObjectId(id));
    await family.save();

    res.json({ _id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, familyCode: family.code, parentId: req.user.parentId });
  } catch (error) {
    next(error);
  }
}

export async function getFamily(req, res, next) {
  try {
    if (req.user.role === 'parent') {
      const family = await Family.findOne({ parentId: req.user._id });
      if (!family) {
        return res.json({ familyCode: null, children: [] });
      }

      const children = await User.find({ parentId: req.user._id }).select('-password');
      const childIds = children.map((child) => child._id.toString());
      const familyChildIds = (family.childIds || [])
        .map((id) => normalizeChildId(id))
        .filter(Boolean);

      if (childIds.length !== familyChildIds.length || !childIds.every((id) => familyChildIds.includes(id))) {
        family.childIds = childIds.map((id) => new mongoose.Types.ObjectId(id));
        await family.save();
      }

      return res.json({ familyCode: family.code, children });
    }

    const family = await Family.findOne({ parentId: req.user.parentId });
    if (!family) {
      return res.json({ familyCode: null, parent: null });
    }

    const parent = await User.findById(family.parentId).select('-password');
    return res.json({ familyCode: family.code, parent });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    res.json(req.user);
  } catch (error) {
    next(error);
  }
}
