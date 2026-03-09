require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
    console.log('☁️ Supabase client initialized');
} else {
    console.warn('⚠️ Supabase credentials missing. Running in local-only mode.');
}

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
CREATE TABLE IF NOT EXISTS "public_settings" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT
);
CREATE TABLE IF NOT EXISTS "public_achievements" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    title TEXT,
    content TEXT,
    icon TEXT
);
CREATE TABLE IF NOT EXISTS "public_curriculum" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    icon TEXT,
    description TEXT,
    details TEXT
);
CREATE TABLE IF NOT EXISTS "public_testimonials" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    role TEXT,
    quote TEXT,
    emoji TEXT
);
`);

// Create default admin account if it doesn't exist
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existingAdmin) {
    db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('admin', 'admin123', 'Admin', 'System Administrator');
    console.log('Default admin created: username=admin, password=admin123');
}

// Seed Public Dashboard Data
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM public_settings').get().count;
if (settingsCount === 0) {
    db.prepare('INSERT INTO public_settings (key, value) VALUES (?, ?)').run('countdown_title', 'Term 2 Admissions Open');
    db.prepare('INSERT INTO public_settings (key, value) VALUES (?, ?)').run('countdown_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
    db.prepare('INSERT INTO public_settings (key, value) VALUES (?, ?)').run('weather_mock', '☀️ 24°C');
    db.prepare('INSERT INTO public_settings (key, value) VALUES (?, ?)').run('transport_status', '🚌 All Routes On Time');
}

const achievementCount = db.prepare('SELECT COUNT(*) as count FROM public_achievements').get().count;
if (achievementCount === 0) {
    const achievements = [
        ['Academics', 'Sarah Jenkins', 'National Science Olympiad Winner 2025. Perfect score in Advanced Physics.', '🥇'],
        ['Sports', 'Senior Boys Football', 'Regional Champions for three consecutive years (2023-2025).', '⚽'],
        ['Arts', 'Drama Club', 'Awarded "Best Ensemble" at the National Schools Theatre Festival.', '🎭']
    ];
    const stmt = db.prepare('INSERT INTO public_achievements (category, title, content, icon) VALUES (?, ?, ?, ?)');
    achievements.forEach(a => stmt.run(...a));
}

const curriculumCount = db.prepare('SELECT COUNT(*) as count FROM public_curriculum').get().count;
if (curriculumCount === 0) {
    const curriculum = [
        ['STEM', '🧪', 'Science, Technology, Engineering & Math', 'Advanced Physics Lab, Robotics & AI Club, AP Calculus & Statistics, Environmental Science'],
        ['Humanities', '📚', 'Languages, History & Social Sciences', 'World Literature, Modern European History, Psychology & Sociology, Model UN Debate Team'],
        ['Creative Arts', '🎭', 'Fine Arts, Music & Performance', 'Digital Graphic Design, Classical & Jazz Orchestra, Theatre Production, 3D Sculpting Studio']
    ];
    const stmt = db.prepare('INSERT INTO public_curriculum (category, icon, description, details) VALUES (?, ?, ?, ?)');
    curriculum.forEach(c => stmt.run(...c));
}

const testimonialCount = db.prepare('SELECT COUNT(*) as count FROM public_testimonials').get().count;
if (testimonialCount === 0) {
    db.prepare('INSERT INTO public_testimonials (name, role, quote, emoji) VALUES (?, ?, ?, ?)').run(
        'Dr. Alistair Chen',
        'Class of 2014 • Senior Lead Engineer, Quantum Compute',
        'The foundation I received here didn\'t just teach me how to pass exams; it taught me how to think critically, innovate, and lead with empathy. It was the launchpad for my career in AI research.',
        '🎓'
    );
}

// Allowed tables for security
const ALLOWED_TABLES = [
    'students', 'attendance', 'fees', 'marks', 'staff', 'subjects', 'assets',
    'timetable', 'library', 'bookLoans', 'discipline', 'health', 'payroll', 'pos',
    'expenses', 'notices', 'hostels', 'hostelAssignments', 'transport',
    'transportAssignments', 'notifications', 'users',
    'public_settings', 'public_achievements', 'public_curriculum', 'public_testimonials'
];

function validateTable(table, res) {
    if (!ALLOWED_TABLES.includes(table)) {
        res.status(400).json({ error: `Invalid table: ${table}` });
        return false;
    }
    return true;
}

// Helper: Sync data to Supabase
async function syncToSupabase(table, data, method = 'upsert', id = null) {
    if (!supabase) return;
    try {
        let result;
        if (method === 'upsert') {
            result = await supabase.from(table).upsert(data);
        } else if (method === 'delete') {
            result = await supabase.from(table).delete().eq('id', id);
        }
        if (result.error) throw result.error;
    } catch (err) {
        console.error(`❌ Supabase sync failed for ${table}:`, err.message);
    }
}

// Startup Sync: Upload all local data to Supabase to ensure cloud is up to date
async function startupSync() {
    if (!supabase) return;
    console.log('🔄 Starting full database sync to cloud...');
    for (const table of ALLOWED_TABLES) {
        try {
            const rows = db.prepare(`SELECT * FROM "${table}"`).all();
            if (rows.length > 0) {
                const { error } = await supabase.from(table).upsert(rows);
                if (error) console.error(`⚠️ Sync failed for ${table}:`, error.message);
            }
        } catch (err) {
            console.error(`⚠️ Could not sync table ${table}:`, err.message);
        }
    }
    console.log('✅ Startup sync complete');
}

startupSync();

// GET all rows with optional filter params
app.get('/api/:table', async (req, res) => {
    const { table } = req.params;
    if (!validateTable(table, res)) return;

    const { _sort, _order, _limit, ...filters } = req.query;

    // Cloud-First: Attempt Supabase fetch
    if (supabase) {
        try {
            let query = supabase.from(table).select('*');
            for (const [key, value] of Object.entries(filters)) {
                query = query.eq(key, value);
            }
            if (_sort) {
                query = query.order(_sort, { ascending: (_order || 'asc').toLowerCase() === 'asc' });
            }
            if (_limit) {
                query = query.limit(parseInt(_limit));
            }
            const { data, error } = await query;
            if (!error && data) {
                return res.json(data);
            }
            if (error) console.error(`⚠️ Supabase fetch error for ${table}:`, error.message);
        } catch (err) {
            console.error(`⚠️ Supabase connection error:`, err.message);
        }
    }

    // Local Fallback: SQLite
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
app.post('/api/:table', async (req, res) => {
    const { table } = req.params;
    if (!validateTable(table, res)) return;

    const insert = (data) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`;
        const result = db.prepare(sql).run(...values);
        const row = db.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(result.lastInsertRowid);

        // Async Sync to Supabase
        syncToSupabase(table, row);

        return row;
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
app.put('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    if (!validateTable(table, res)) return;
    try {
        const data = req.body;
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(k => `"${k}" = ?`).join(', ');
        db.prepare(`UPDATE "${table}" SET ${setClause} WHERE id = ?`).run(...values, id);
        const row = db.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id);

        // Async Sync to Supabase
        syncToSupabase(table, row);

        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT bulk update with query filters
app.put('/api/bulk/:table', async (req, res) => {
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

        // Sync affected rows to Supabase
        const updatedRows = db.prepare(`SELECT * FROM "${table}" WHERE ${whereClause}`).all(...whereValues);
        if (updatedRows.length > 0) {
            syncToSupabase(table, updatedRows);
        }

        res.json({ updated: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE single row by id
app.delete('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    if (!validateTable(table, res)) return;
    try {
        db.prepare(`DELETE FROM "${table}" WHERE id = ?`).run(id);

        // Async Sync to Supabase
        syncToSupabase(table, null, 'delete', id);

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE bulk with query filters
app.delete('/api/bulk/:table', async (req, res) => {
    const { table } = req.params;
    if (!validateTable(table, res)) return;
    const filters = req.query;
    try {
        let result;
        if (Object.keys(filters).length === 0) {
            // Delete all in Supabase first (careful!)
            if (supabase) await supabase.from(table).delete().neq('id', 0);
            result = db.prepare(`DELETE FROM "${table}"`).run();
        } else {
            const keys = Object.keys(filters);
            const values = Object.values(filters);
            const whereClause = keys.map(k => `"${k}" = ?`).join(' AND ');

            // Sync delete to Supabase
            if (supabase) {
                let query = supabase.from(table).delete();
                for (const [key, value] of Object.entries(filters)) {
                    query = query.eq(key, value);
                }
                await query;
            }

            result = db.prepare(`DELETE FROM "${table}" WHERE ${whereClause}`).run(...values);
        }
        res.json({ deleted: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/config', (req, res) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) {
        console.warn('⚠️ Client requested config but SUPABASE_URL/KEY are missing in environment');
        return res.json({ error: 'Supabase credentials not configured on server', initialized: false });
    }
    res.json({
        supabaseUrl: url,
        supabaseKey: key,
        initialized: true
    });
});

app.listen(port, () => {
    console.log(`Egles SMIS server running on port ${port}`);
});
