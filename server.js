require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files

// Use Render persistent disk path if available, otherwise local
const dbPath = process.env.RENDER_DISK_PATH
    ? path.join(process.env.RENDER_DISK_PATH, 'egles.db')
    : path.join(__dirname, 'egles.db');

console.log(`Database path: ${dbPath}`);

// Initialize SQLite database
const db = new Database(dbPath);


// Auto-create all tables on startup
db.exec(`
CREATE TABLE IF NOT EXISTS "students" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT UNIQUE,
    name TEXT,
    class TEXT,
    gender TEXT,
    parentContact TEXT
);
CREATE TABLE IF NOT EXISTS "attendance" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT,
    date TEXT,
    status TEXT
);
CREATE TABLE IF NOT EXISTS "fees" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT,
    amount REAL,
    date TEXT,
    type TEXT
);
CREATE TABLE IF NOT EXISTS "marks" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT,
    subject TEXT,
    score INTEGER,
    term TEXT,
    year INTEGER
);
CREATE TABLE IF NOT EXISTS "staff" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staffId TEXT UNIQUE,
    name TEXT,
    role TEXT,
    contact TEXT
);
CREATE TABLE IF NOT EXISTS "subjects" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    class TEXT,
    teacherId TEXT
);
CREATE TABLE IF NOT EXISTS "assets" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    quantity INTEGER,
    condition TEXT,
    value REAL,
    purchaseDate TEXT
);
CREATE TABLE IF NOT EXISTS "timetable" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class TEXT,
    day TEXT,
    period TEXT,
    subject TEXT,
    teacherId TEXT
);
CREATE TABLE IF NOT EXISTS "library" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    ISBN TEXT,
    author TEXT,
    quantity INTEGER,
    available INTEGER
);
CREATE TABLE IF NOT EXISTS "bookLoans" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookId INTEGER,
    studentId TEXT,
    loanDate TEXT,
    returnDate TEXT,
    status TEXT
);
CREATE TABLE IF NOT EXISTS "discipline" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT,
    infraction TEXT,
    date TEXT,
    action TEXT,
    severity TEXT
);
CREATE TABLE IF NOT EXISTS "health" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT,
    bloodGroup TEXT,
    allergies TEXT,
    emergencyContact TEXT
);
CREATE TABLE IF NOT EXISTS "payroll" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staffId TEXT,
    month TEXT,
    year INTEGER,
    salary REAL,
    bonus REAL,
    deductions REAL,
    status TEXT
);
CREATE TABLE IF NOT EXISTS "pos" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemName TEXT,
    price REAL,
    quantity INTEGER,
    date TEXT
);
CREATE TABLE IF NOT EXISTS "expenses" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    amount REAL,
    category TEXT,
    date TEXT
);
CREATE TABLE IF NOT EXISTS "notices" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    date TEXT,
    expiry TEXT
);
CREATE TABLE IF NOT EXISTS "hostels" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    capacity INTEGER,
    gender TEXT
);
CREATE TABLE IF NOT EXISTS "hostelAssignments" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT,
    hostelId INTEGER,
    roomNo TEXT
);
CREATE TABLE IF NOT EXISTS "transport" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route TEXT,
    busNo TEXT,
    driver TEXT
);
CREATE TABLE IF NOT EXISTS "transportAssignments" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT,
    routeId INTEGER
);
CREATE TABLE IF NOT EXISTS "notifications" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    date TEXT,
    type TEXT,
    read INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "users" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    name TEXT
);
`);

// Create default admin account if it doesn't exist
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existingAdmin) {
    db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('admin', 'admin123', 'Admin', 'System Administrator');
    console.log('Default admin created: username=admin, password=admin123');
}

// Allowed tables for security
const ALLOWED_TABLES = [
    'students', 'attendance', 'fees', 'marks', 'staff', 'subjects', 'assets',
    'timetable', 'library', 'bookLoans', 'discipline', 'health', 'payroll', 'pos',
    'expenses', 'notices', 'hostels', 'hostelAssignments', 'transport',
    'transportAssignments', 'notifications', 'users'
];

function validateTable(table, res) {
    if (!ALLOWED_TABLES.includes(table)) {
        res.status(400).json({ error: `Invalid table: ${table}` });
        return false;
    }
    return true;
}

// GET all rows with optional filter params
app.get('/api/:table', (req, res) => {
    const { table } = req.params;
    if (!validateTable(table, res)) return;

    const { _sort, _order, _limit, ...filters } = req.query;

    try {
        let sql = `SELECT * FROM "${table}"`;
        const values = [];
        const conditions = [];

        for (const [key, value] of Object.entries(filters)) {
            conditions.push(`"${key}" = ?`);
            values.push(value);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        if (_sort) sql += ` ORDER BY "${_sort}" ${(_order || 'ASC').toUpperCase()}`;
        if (_limit) sql += ` LIMIT ${parseInt(_limit)}`;

        const rows = db.prepare(sql).all(...values);
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET single row by id
app.get('/api/:table/:id', (req, res) => {
    const { table, id } = req.params;
    if (!validateTable(table, res)) return;
    try {
        const row = db.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST single or bulk insert
app.post('/api/:table', (req, res) => {
    const { table } = req.params;
    if (!validateTable(table, res)) return;

    const insert = (data) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`;
        const result = db.prepare(sql).run(...values);
        return db.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(result.lastInsertRowid);
    };

    try {
        const data = req.body;
        if (Array.isArray(data)) {
            const rows = data.map(insert);
            res.status(201).json(rows);
        } else {
            res.status(201).json(insert(data));
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT update single row by id
app.put('/api/:table/:id', (req, res) => {
    const { table, id } = req.params;
    if (!validateTable(table, res)) return;
    try {
        const data = req.body;
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(k => `"${k}" = ?`).join(', ');
        db.prepare(`UPDATE "${table}" SET ${setClause} WHERE id = ?`).run(...values, id);
        const row = db.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id);
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT bulk update with query filters
app.put('/api/bulk/:table', (req, res) => {
    const { table } = req.params;
    if (!validateTable(table, res)) return;
    const filters = req.query;
    const updateData = req.body;
    try {
        const setKeys = Object.keys(updateData);
        const setValues = Object.values(updateData);
        const setClause = setKeys.map(k => `"${k}" = ?`).join(', ');

        const whereKeys = Object.keys(filters);
        const whereValues = Object.values(filters);
        const whereClause = whereKeys.map(k => `"${k}" = ?`).join(' AND ');

        const sql = `UPDATE "${table}" SET ${setClause} WHERE ${whereClause}`;
        const result = db.prepare(sql).run(...setValues, ...whereValues);
        res.json({ updated: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE single row by id
app.delete('/api/:table/:id', (req, res) => {
    const { table, id } = req.params;
    if (!validateTable(table, res)) return;
    try {
        db.prepare(`DELETE FROM "${table}" WHERE id = ?`).run(id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE bulk with query filters
app.delete('/api/bulk/:table', (req, res) => {
    const { table } = req.params;
    if (!validateTable(table, res)) return;
    const filters = req.query;
    try {
        if (Object.keys(filters).length === 0) {
            const result = db.prepare(`DELETE FROM "${table}"`).run();
            return res.json({ deleted: result.changes });
        }
        const keys = Object.keys(filters);
        const values = Object.values(filters);
        const whereClause = keys.map(k => `"${k}" = ?`).join(' AND ');
        const result = db.prepare(`DELETE FROM "${table}" WHERE ${whereClause}`).run(...values);
        res.json({ deleted: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Egles SMIS server running on port ${port}`);
});
