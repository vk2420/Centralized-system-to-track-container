const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// User login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, password } = req.body;
    
    // Find user by username
    const user = await db.get(`
      SELECT id, username, email, password_hash, full_name, role
      FROM users 
      WHERE username = ?
    `, [username]);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Remove password from response
    delete user.password_hash;
    
    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user details
    const user = await db.get(`
      SELECT id, username, email, full_name, role, created_at
      FROM users 
      WHERE id = ?
    `, [decoded.userId]);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.json({
      valid: true,
      user
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Error verifying token:', error);
    res.status(500).json({ message: 'Error verifying token' });
  }
});

// Change password (requires current password)
router.post('/change-password', [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { current_password, new_password } = req.body;
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get user with current password
    const user = await db.get(`
      SELECT password_hash FROM users WHERE id = ?
    `, [userId]);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);
    
    // Update password
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await db.get(`
      SELECT id, username, email, full_name, role, created_at
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update current user profile
router.put('/profile', [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.headers['user-id'];
    const updateData = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if email is being changed and if it conflicts
    if (updateData.email) {
      const emailConflict = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?', 
        [updateData.email, userId]
      );
      if (emailConflict) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    
    // Build update query
    const updateFields = [];
    const updateParams = [];
    
    Object.keys(updateData).forEach(key => {
      if (['email', 'full_name'].includes(key)) {
        updateFields.push(`${key} = ?`);
        updateParams.push(updateData[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.json({ message: 'No changes detected' });
    }
    
    updateParams.push(userId);
    
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.run(sql, updateParams);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

module.exports = router;