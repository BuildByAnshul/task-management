const express = require('express');
const router = express.Router();
const fs = require('fs');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticate,
} = require('../middleware/auth');
const { avatarUpload } = require('../middleware/upload');
const { uploadToCloudinary } = require('../config/cloudinary');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'name, email, password required' } });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Password must be at least 6 characters' } });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Email already in use' } });
    }

    const user = await User.create({ name, email, passwordHash: password });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    res.status(201).json({
      success: true,
      data: { user: user.toPublic(), accessToken },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'email and password required' } });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Keep max 5 refresh tokens
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    await user.save();

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    res.json({
      success: true,
      data: { user: user.toPublic(), accessToken },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshTokens.includes(token)) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token revoked' } });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens = user.refreshTokens.filter(t => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.cookie('accessToken', newAccessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS);

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(t => t !== token);
        await user.save();
      }
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: { user: req.user.toPublic ? req.user.toPublic() : req.user } });
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, avatarUrl, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    // Change password if requested
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'Current password is required to set a new password' }
        });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' }
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'New password must be at least 6 characters' }
        });
      }

      user.passwordHash = newPassword; // Will be hashed by pre('save') hook
    }

    await user.save();

    res.json({
      success: true,
      data: {
        user: user.toPublic(),
        message: 'Profile updated successfully',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/profile/avatar (Upload local image & store in Cloudinary)
router.post('/profile/avatar', authenticate, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'No image file uploaded' },
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Attempt upload to Cloudinary
    let avatarUrl = await uploadToCloudinary(req.file.path, 'novaboard/avatars');

    if (avatarUrl) {
      // Cloudinary succeeded: remove local temporary file
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('Failed to delete temporary local file:', e.message);
      }
    } else {
      // Fallback to local server static path
      const serverHost = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
      avatarUrl = `${serverHost}/uploads/avatars/${req.file.filename}`;
    }

    user.avatarUrl = avatarUrl;
    await user.save();

    res.json({
      success: true,
      data: {
        user: user.toPublic(),
        avatarUrl,
        message: 'Avatar uploaded and updated successfully',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
