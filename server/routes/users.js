const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await db.query(`
      SELECT id, username, email, full_name, role, created_at
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await db.get(`
      SELECT id, username, email, full_name, role, created_at
      FROM users 
      WHERE id = ?
    `, [id]);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Create new user
router.post('/', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('role').isIn(['admin', 'user', 'manager']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, email, password, full_name, role } = req.body;
    
    // Check if username or email already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?', 
      [username, email]
    );
    
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await db.run(`
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `, [username, email, passwordHash, full_name, role]);
    
    res.status(201).json({
      message: 'User created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Update user
router.put('/:id', [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('role').optional().isIn(['admin', 'user', 'manager']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if user exists
    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is being changed and if it conflicts
    if (updateData.email) {
      const emailConflict = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?', 
        [updateData.email, id]
      );
      if (emailConflict) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    
    // Build update query
    const updateFields = [];
    const updateParams = [];
    
    Object.keys(updateData).forEach(key => {
      if (['email', 'full_name', 'role'].includes(key)) {
        updateFields.push(`${key} = ?`);
        updateParams.push(updateData[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.json({ message: 'No changes detected' });
    }
    
    updateParams.push(id);
    
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.run(sql, updateParams);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Change user password
router.put('/:id/password', [
  body('new_password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const { new_password } = req.body;
    
    // Check if user exists
    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(new_password, 10);
    
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has containers (prevent deletion if they do)
    const containerCount = await db.get(
      'SELECT COUNT(*) as count FROM containers WHERE created_by = ? OR updated_by = ?', 
      [id, id]
    );
    
    if (containerCount.count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user who has created or updated containers' 
      });
    }
    
    // Delete user
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Get user activity (containers they've worked with)
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    
    const containers = await db.query(`
      SELECT 
        c.*,
        ct.name as container_type_name
      FROM containers c
      JOIN container_types ct ON c.container_type_id = ct.id
      WHERE c.created_by = ? OR c.updated_by = ?
      ORDER BY c.updated_at DESC
    `, [id, id]);
    
    const history = await db.query(`
      SELECT 
        ch.*,
        c.container_number,
        ct.name as container_type_name
      FROM container_history ch
      JOIN containers c ON ch.container_id = c.id
      JOIN container_types ct ON c.container_type_id = ct.id
      WHERE ch.changed_by = ?
      ORDER BY ch.changed_at DESC
      LIMIT 50
    `, [id]);
    
    res.json({
      containers,
      history
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ message: 'Error fetching user activity' });
  }
});

module.exports = router;