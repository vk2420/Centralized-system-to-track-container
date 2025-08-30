const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🗄️ Initializing Container Tracker Database...');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Container types table
  db.run(`
    CREATE TABLE IF NOT EXISTS container_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Containers table
  db.run(`
    CREATE TABLE IF NOT EXISTS containers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      container_number TEXT UNIQUE NOT NULL,
      container_type_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      planned_date DATE,
      expected_arrival_date DATE,
      actual_arrival_date DATE,
      departure_date DATE,
      destination TEXT,
      notes TEXT,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (container_type_id) REFERENCES container_types (id),
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (updated_by) REFERENCES users (id)
    )
  `);

  // Container history table for tracking changes
  db.run(`
    CREATE TABLE IF NOT EXISTS container_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      container_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by INTEGER NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (container_id) REFERENCES containers (id),
      FOREIGN KEY (changed_by) REFERENCES users (id)
    )
  `);

  // Insert default container types
  const defaultTypes = [
    ['Mattress', 'Mattress containers'],
    ['Sofa', 'Sofa and upholstery containers'],
    ['Dining', 'Dining furniture containers'],
    ['Furniture', 'General furniture containers']
  ];

  const insertType = db.prepare(`
    INSERT OR IGNORE INTO container_types (name, description) VALUES (?, ?)
  `);

  defaultTypes.forEach(([name, description]) => {
    insertType.run(name, description);
  });

  // Insert default admin user
  const bcrypt = require('bcryptjs');
  const adminPassword = bcrypt.hashSync('admin123', 10);
  
  db.run(`
    INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role)
    VALUES ('admin', 'admin@warehouse.com', ?, 'System Administrator', 'admin')
  `, [adminPassword]);

  insertType.finalize();
});

console.log('✅ Database initialized successfully!');
console.log('🔑 Default admin credentials:');
console.log('   Username: admin');
console.log('   Password: admin123');

db.close((err) => {
  if (err) {
    console.error('❌ Error closing database:', err.message);
  } else {
    console.log('🔒 Database connection closed.');
  }
});