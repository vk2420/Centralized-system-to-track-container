const express = require('express');
const router = express.Router();
const db = require('../database');
const { body, validationResult } = require('express-validator');
const moment = require('moment');

// Middleware to check if user is authenticated
const authenticateUser = (req, res, next) => {
  // In a real app, you'd verify JWT token here
  // For now, we'll use a simple header check
  const userId = req.headers['user-id'];
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  req.userId = parseInt(userId);
  next();
};

// Get all containers with filters
router.get('/', async (req, res) => {
  try {
    const { status, source, container_type, date_from, date_to } = req.query;
    
    let sql = `
      SELECT 
        c.*,
        ct.name as container_type_name,
        u1.full_name as created_by_name,
        u2.full_name as updated_by_name
      FROM containers c
      JOIN container_types ct ON c.container_type_id = ct.id
      JOIN users u1 ON c.created_by = u1.id
      JOIN users u2 ON c.updated_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }
    
    if (source) {
      sql += ' AND c.source = ?';
      params.push(source);
    }
    
    if (container_type) {
      sql += ' AND c.container_type_id = ?';
      params.push(container_type);
    }
    
    if (date_from) {
      sql += ' AND c.expected_arrival_date >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      sql += ' AND c.expected_arrival_date <= ?';
      params.push(date_to);
    }
    
    sql += ' ORDER BY c.created_at DESC';
    
    const containers = await db.query(sql, params);
    res.json(containers);
  } catch (error) {
    console.error('Error fetching containers:', error);
    res.status(500).json({ message: 'Error fetching containers' });
  }
});

// Get container by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const container = await db.get(`
      SELECT 
        c.*,
        ct.name as container_type_name,
        u1.full_name as created_by_name,
        u2.full_name as updated_by_name
      FROM containers c
      JOIN container_types ct ON c.container_type_id = ct.id
      JOIN users u1 ON c.created_by = u1.id
      JOIN users u2 ON c.updated_by = u2.id
      WHERE c.id = ?
    `, [id]);
    
    if (!container) {
      return res.status(404).json({ message: 'Container not found' });
    }
    
    // Get container history
    const history = await db.query(`
      SELECT 
        ch.*,
        u.full_name as changed_by_name
      FROM container_history ch
      JOIN users u ON ch.changed_by = u.id
      WHERE ch.container_id = ?
      ORDER BY ch.changed_at DESC
    `, [id]);
    
    container.history = history;
    
    res.json(container);
  } catch (error) {
    console.error('Error fetching container:', error);
    res.status(500).json({ message: 'Error fetching container' });
  }
});

// Create new container
router.post('/', authenticateUser, [
  body('container_number').notEmpty().withMessage('Container number is required'),
  body('container_type_id').isInt().withMessage('Container type is required'),
  body('source').notEmpty().withMessage('Source is required'),
  body('status').isIn(['planned', 'in_transit', 'arrived', 'departed']).withMessage('Invalid status'),
  body('planned_date').optional().isDate().withMessage('Invalid planned date'),
  body('expected_arrival_date').optional().isDate().withMessage('Invalid expected arrival date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      container_number,
      container_type_id,
      source,
      status,
      planned_date,
      expected_arrival_date,
      destination,
      notes
    } = req.body;
    
    // Check if container number already exists
    const existing = await db.get('SELECT id FROM containers WHERE container_number = ?', [container_number]);
    if (existing) {
      return res.status(400).json({ message: 'Container number already exists' });
    }
    
    const result = await db.run(`
      INSERT INTO containers (
        container_number, container_type_id, source, status, planned_date,
        expected_arrival_date, destination, notes, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      container_number, container_type_id, source, status, planned_date,
      expected_arrival_date, destination, notes, req.userId, req.userId
    ]);
    
    res.status(201).json({
      message: 'Container created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Error creating container:', error);
    res.status(500).json({ message: 'Error creating container' });
  }
});

// Update container
router.put('/:id', authenticateUser, [
  body('container_type_id').optional().isInt().withMessage('Invalid container type'),
  body('status').optional().isIn(['planned', 'in_transit', 'arrived', 'departed']).withMessage('Invalid status'),
  body('planned_date').optional().isDate().withMessage('Invalid planned date'),
  body('expected_arrival_date').optional().isDate().withMessage('Invalid expected arrival date'),
  body('actual_arrival_date').optional().isDate().withMessage('Invalid actual arrival date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const updateData = req.body;
    
    // Get current container data for history tracking
    const currentContainer = await db.get('SELECT * FROM containers WHERE id = ?', [id]);
    if (!currentContainer) {
      return res.status(404).json({ message: 'Container not found' });
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];
    const trackedFields = ['status', 'planned_date', 'expected_arrival_date', 'actual_arrival_date', 'departure_date', 'destination', 'notes'];
    
    Object.keys(updateData).forEach(key => {
      if (trackedFields.includes(key) && updateData[key] !== currentContainer[key]) {
        updateFields.push(`${key} = ?`);
        updateParams.push(updateData[key]);
        
        // Track changes in history
        db.run(`
          INSERT INTO container_history (container_id, field_name, old_value, new_value, changed_by)
          VALUES (?, ?, ?, ?, ?)
        `, [id, key, currentContainer[key], updateData[key], req.userId]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.json({ message: 'No changes detected' });
    }
    
    updateFields.push('updated_by = ?');
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(req.userId);
    updateParams.push(id);
    
    const sql = `UPDATE containers SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.run(sql, updateParams);
    
    res.json({ message: 'Container updated successfully' });
  } catch (error) {
    console.error('Error updating container:', error);
    res.status(500).json({ message: 'Error updating container' });
  }
});

// Delete container
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if container exists
    const container = await db.get('SELECT id FROM containers WHERE id = ?', [id]);
    if (!container) {
      return res.status(404).json({ message: 'Container not found' });
    }
    
    // Delete related history first
    await db.run('DELETE FROM container_history WHERE container_id = ?', [id]);
    
    // Delete container
    await db.run('DELETE FROM containers WHERE id = ?', [id]);
    
    res.json({ message: 'Container deleted successfully' });
  } catch (error) {
    console.error('Error deleting container:', error);
    res.status(500).json({ message: 'Error deleting container' });
  }
});

// Get container statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM containers 
      GROUP BY status
    `);
    
    const sourceStats = await db.query(`
      SELECT 
        source,
        COUNT(*) as count
      FROM containers 
      GROUP BY source
    `);
    
    const typeStats = await db.query(`
      SELECT 
        ct.name as type,
        COUNT(*) as count
      FROM containers c
      JOIN container_types ct ON c.container_type_id = ct.id
      GROUP BY ct.id, ct.name
    `);
    
    const today = moment().format('YYYY-MM-DD');
    const upcoming = await db.query(`
      SELECT COUNT(*) as count
      FROM containers 
      WHERE expected_arrival_date >= ? AND status IN ('planned', 'in_transit')
    `, [today]);
    
    res.json({
      statusBreakdown: stats,
      sourceBreakdown: sourceStats,
      typeBreakdown: typeStats,
      upcomingContainers: upcoming[0]?.count || 0
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

module.exports = router;