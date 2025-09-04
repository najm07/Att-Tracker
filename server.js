import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { getDatabase } from './database.js';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = getDatabase();

const app = express();
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
const PORT = process.env.PORT || 3001;


const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  }
});

app.get('/api/groups', (req, res) => {
  try {
    // return groups with employee counts to avoid extra client requests
    const stmt = db.prepare(`
      SELECT 
        g.id,
        g.name,
        g.created_at,
        (SELECT COUNT(*) FROM employees e WHERE e.group_id = g.id) as employee_count
      FROM groups g
      ORDER BY g.name
    `);
    const groups = stmt.all();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/groups', (req, res) => {
  try {
    const { name } = req.body;
    const stmt = db.prepare('INSERT INTO groups (name) VALUES (?)');
    const result = stmt.run(name);
    res.json({ 
      id: result.lastInsertRowid, 
      name,
      message: 'Group created successfully' 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Employees
app.post('/api/groups/:id/employees', (req, res) => {
  try {
    const { name } = req.body;
    const groupId = parseInt(req.params.id, 10);
    if (!name || !groupId) return res.status(400).json({ error: 'Missing name or group id' });

    const stmt = db.prepare('INSERT INTO employees (name, group_id) VALUES (?, ?)');
    const result = stmt.run(name, groupId);

    res.json({
      id: result.lastInsertRowid,
      name,
      group_id: groupId,
      message: 'Employee added successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/groups/:id/employees', (req, res) => {
  try {
  const groupId = parseInt(req.params.id, 10);
  const stmt = db.prepare('SELECT * FROM employees WHERE group_id = ? ORDER BY name');
  const employees = stmt.all(groupId);
  res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excel import
app.post('/api/groups/:id/employees/import', upload.single('file'), (req, res) => {
  try {
    const groupId = req.params.id;
    const filePath = req.file.path;
    
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Insert employees
    const stmt = db.prepare('INSERT INTO employees (name, group_id) VALUES (?, ?)');
    const insertMany = db.transaction((employees) => {
      for (const employee of employees) {
        stmt.run(employee.Name || employee.name, groupId);
      }
    });
    
    insertMany(data);
    
    // Clean up uploaded file
    import('fs').unlinkSync(filePath);
    
    res.json({ 
      message: `Successfully imported ${data.length} employees`,
      count: data.length 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Attendance
app.post('/api/attendance', (req, res) => {
  try {
    const { employee_id, date, status, extra_hours = 0 } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO attendance (employee_id, date, status, extra_hours) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(employee_id, date) 
      DO UPDATE SET status = ?, extra_hours = ?
    `);
    
    stmt.run(employee_id, date, status, extra_hours, status, extra_hours);
    
    res.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/groups/:id/attendance', (req, res) => {
  try {
    const groupId = req.params.id;
    const month = req.query.month;
    
    let query = `
      SELECT 
        e.id as employee_id,
        e.name as employee_name,
        a.date,
        a.status,
        a.extra_hours
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
      WHERE e.group_id = ?
    `;
    
    const params = [groupId];
    
    if (month) {
      query += ` AND (a.date IS NULL OR a.date LIKE ?)`;
      params.push(`${month}%`);
    }
    
    query += ` ORDER BY e.name, a.date`;
    
    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export attendance to Excel
app.get('/api/groups/:id/attendance/export', (req, res) => {
  try {
    const groupId = req.params.id;
    const month = req.query.month;
    
    // Get group name
    const groupStmt = db.prepare('SELECT name FROM groups WHERE id = ?');
    const group = groupStmt.get(groupId);
    
    // Get attendance data
    let query = `
      SELECT 
        e.name as employee_name,
        a.date,
        a.status,
        a.extra_hours
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
      WHERE e.group_id = ?
    `;
    
    const params = [groupId];
    if (month) {
      query += ` AND (a.date IS NULL OR a.date LIKE ?)`;
      params.push(`${month}%`);
    }
    
    query += ` ORDER BY e.name, a.date`;
    
    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    
    // Create Excel workbook
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(results);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    
    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename="${group?.name || 'Group'}_attendance_${month || 'all'}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total employees
    const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get() || { count: 0 };

    // Total groups
    const totalGroups = db.prepare('SELECT COUNT(*) as count FROM groups').get() || { count: 0 };

    // Today's attendance
  const presentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'P'").get(today) || { count: 0 };
  const absentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'A'").get(today) || { count: 0 };

    // Attendance rate data for chart (last 30 days)
    const attendanceStats = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM attendance 
      WHERE date >= date('now', '-30 days')
      GROUP BY status
    `).all() || [];

    res.json({
      totalEmployees: totalEmployees.count,
      totalGroups: totalGroups.count,
      presentToday: presentToday.count,
      absentToday: absentToday.count,
      attendanceStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});


// Serve frontend
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});