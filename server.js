require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Supabase Configuration (Optional Sync)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
    console.log('☁️ Supabase client initialized for sync');
} else {
    console.warn('⚠️ Supabase credentials missing. Sync disabled.');
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files

// Initialize PostgreSQL Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render Postgres
    }
});

pool.on('connect', () => {
    console.log('🐘 Connected to PostgreSQL (Render Database)');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL Pool Error:', err.message);
});

// Auto-create all tables on startup (PostgreSQL syntax)
async function initDb() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                studentId TEXT UNIQUE,
                name TEXT,
                class TEXT,
                gender TEXT,
                parentContact TEXT
            );
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                studentId TEXT,
                date TEXT,
                status TEXT
            );
            CREATE TABLE IF NOT EXISTS fees (
                id SERIAL PRIMARY KEY,
                studentId TEXT,
                amount DECIMAL(10,2),
                date TEXT,
                type TEXT
            );
            CREATE TABLE IF NOT EXISTS marks (
                id SERIAL PRIMARY KEY,
                studentId TEXT,
                subject TEXT,
                score INTEGER,
                term TEXT,
                year INTEGER
            );
            CREATE TABLE IF NOT EXISTS staff (
                id SERIAL PRIMARY KEY,
                staffId TEXT UNIQUE,
                name TEXT,
                role TEXT,
                contact TEXT
            );
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name TEXT,
                class TEXT,
                teacherId TEXT
            );
            CREATE TABLE IF NOT EXISTS assets (
                id SERIAL PRIMARY KEY,
                name TEXT,
                quantity INTEGER,
                condition TEXT,
                value DECIMAL(10,2),
                purchaseDate TEXT
            );
            CREATE TABLE IF NOT EXISTS timetable (
                id SERIAL PRIMARY KEY,
                class TEXT,
                day TEXT,
                period TEXT,
                subject TEXT,
                teacherId TEXT
            );
            CREATE TABLE IF NOT EXISTS library (
                id SERIAL PRIMARY KEY,
                title TEXT,
                ISBN TEXT,
                author TEXT,
                quantity INTEGER,
                available INTEGER
            );
            CREATE TABLE IF NOT EXISTS bookLoans (
                id SERIAL PRIMARY KEY,
                bookId INTEGER,
                studentId TEXT,
                loanDate TEXT,
                returnDate TEXT,
                status TEXT
            );
            CREATE TABLE IF NOT EXISTS discipline (
                id SERIAL PRIMARY KEY,
                studentId TEXT,
                infraction TEXT,
                date TEXT,
                action TEXT,
                severity TEXT
            );
            CREATE TABLE IF NOT EXISTS health (
                id SERIAL PRIMARY KEY,
                studentId TEXT,
                bloodGroup TEXT,
                allergies TEXT,
                emergencyContact TEXT
            );
            CREATE TABLE IF NOT EXISTS payroll (
                id SERIAL PRIMARY KEY,
                staffId TEXT,
                month TEXT,
                year INTEGER,
                salary DECIMAL(10,2),
                bonus DECIMAL(10,2),
                deductions DECIMAL(10,2),
                status TEXT
            );
            CREATE TABLE IF NOT EXISTS pos (
                id SERIAL PRIMARY KEY,
                itemName TEXT,
                price DECIMAL(10,2),
                quantity INTEGER,
                date TEXT
            );
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                name TEXT,
                amount DECIMAL(10,2),
                category TEXT,
                date TEXT
            );
            CREATE TABLE IF NOT EXISTS notices (
                id SERIAL PRIMARY KEY,
                title TEXT,
                content TEXT,
                date TEXT,
                priority TEXT DEFAULT 'Medium'
            );
            CREATE TABLE IF NOT EXISTS hostels (
                id SERIAL PRIMARY KEY,
                name TEXT,
                capacity INTEGER,
                gender TEXT
            );
            CREATE TABLE IF NOT EXISTS hostelAssignments (
                id SERIAL PRIMARY KEY,
                studentId TEXT,
                hostelId INTEGER,
                roomNo TEXT
            );
            CREATE TABLE IF NOT EXISTS transport (
                id SERIAL PRIMARY KEY,
                route TEXT,
                busNo TEXT,
                driver TEXT
            );
            CREATE TABLE IF NOT EXISTS transportAssignments (
                id SERIAL PRIMARY KEY,
                studentId TEXT,
                routeId INTEGER
            );
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                title TEXT,
                message TEXT,
                date TEXT,
                type TEXT,
                read INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT,
                name TEXT
            );
            CREATE TABLE IF NOT EXISTS public_settings (
                id SERIAL PRIMARY KEY,
                key TEXT UNIQUE,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS public_achievements (
                id SERIAL PRIMARY KEY,
                category TEXT,
                title TEXT,
                content TEXT,
                icon TEXT
            );
            CREATE TABLE IF NOT EXISTS public_curriculum (
                id SERIAL PRIMARY KEY,
                category TEXT,
                icon TEXT,
                description TEXT,
                details TEXT
            );
            CREATE TABLE IF NOT EXISTS public_testimonials (
                id SERIAL PRIMARY KEY,
                name TEXT,
                role TEXT,
                quote TEXT,
                emoji TEXT
            );
        `);

        // Create default admin account
        const adminRes = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
        if (adminRes.rowCount === 0) {
            await client.query('INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)', ['admin', 'admin123', 'Admin', 'System Administrator']);
            console.log('Default admin created: username=admin, password=admin123');
        }

        // Seed Public Dashboard Data
        const settingsRes = await client.query('SELECT COUNT(*) as count FROM public_settings');
        if (parseInt(settingsRes.rows[0].count) === 0) {
            await client.query('INSERT INTO public_settings (key, value) VALUES ($1, $2)', ['countdown_title', 'Term 2 Admissions Open']);
            await client.query('INSERT INTO public_settings (key, value) VALUES ($1, $2)', ['countdown_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()]);
            await client.query('INSERT INTO public_settings (key, value) VALUES ($1, $2)', ['weather_mock', '☀️ 24°C']);
            await client.query('INSERT INTO public_settings (key, value) VALUES ($1, $2)', ['transport_status', '🚌 All Routes On Time']);
        }

        const achievementRes = await client.query('SELECT COUNT(*) as count FROM public_achievements');
        if (parseInt(achievementRes.rows[0].count) === 0) {
            const achievements = [
                ['Academics', 'Sarah Jenkins', 'National Science Olympiad Winner 2025. Perfect score in Advanced Physics.', '🥇'],
                ['Sports', 'Senior Boys Football', 'Regional Champions for three consecutive years (2023-2025).', '⚽'],
                ['Arts', 'Drama Club', 'Awarded "Best Ensemble" at the National Schools Theatre Festival.', '🎭']
            ];
            for (const a of achievements) {
                await client.query('INSERT INTO public_achievements (category, title, content, icon) VALUES ($1, $2, $3, $4)', a);
            }
        }

        const curriculumRes = await client.query('SELECT COUNT(*) as count FROM public_curriculum');
        if (parseInt(curriculumRes.rows[0].count) === 0) {
            const curriculum = [
                ['STEM', '🧪', 'Science, Technology, Engineering & Math', 'Advanced Physics Lab, Robotics & AI Club, AP Calculus & Statistics, Environmental Science'],
                ['Humanities', '📚', 'Languages, History & Social Sciences', 'World Literature, Modern European History, Psychology & Sociology, Model UN Debate Team'],
                ['Creative Arts', '🎭', 'Fine Arts, Music & Performance', 'Digital Graphic Design, Classical & Jazz Orchestra, Theatre Production, 3D Sculpting Studio']
            ];
            for (const c of curriculum) {
                await client.query('INSERT INTO public_curriculum (category, icon, description, details) VALUES ($1, $2, $3, $4)', c);
            }
        }

        const testimonialRes = await client.query('SELECT COUNT(*) as count FROM public_testimonials');
        if (parseInt(testimonialRes.rows[0].count) === 0) {
            await client.query('INSERT INTO public_testimonials (name, role, quote, emoji) VALUES ($1, $2, $3, $4)', [
                'Dr. Alistair Chen',
                'Class of 2014 • Senior Lead Engineer, Quantum Compute',
                'The foundation I received here didn\'t just teach me how to pass exams; it taught me how to think critically, innovate, and lead with empathy. It was the launchpad for my career in AI research.',
                '🎓'
            ]);
        }

        await client.query('COMMIT');
        console.log('✅ Database initialized and seed data ready');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Database initialization failed:', err.message);
    } finally {
        client.release();
    }
}

initDb();

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

// Helper: Sync data to Supabase (Optional)
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
            const { rows } = await pool.query(`SELECT * FROM ${table}`);
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

    // Local Fallback: PostgreSQL
    try {
        let sql = `SELECT * FROM ${table}`;
        const values = [];
        const conditions = [];

        let i = 1;
        for (const [key, value] of Object.entries(filters)) {
            conditions.push(`${key} = $${i++}`);
            values.push(value);
        }
        
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        if (_sort) sql += ` ORDER BY ${_sort} ${(_order || 'ASC').toUpperCase()}`;
        if (_limit) sql += ` LIMIT ${parseInt(_limit)}`;

        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET single row by id
app.get('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    if (!validateTable(table, res)) return;
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST single or bulk insert
app.post('/api/:table', async (req, res) => {
    const { table } = req.params;
    if (!validateTable(table, res)) return;

    try {
        const data = req.body;
        if (Array.isArray(data)) {
            const insertedRows = [];
            for (const item of data) {
                const keys = Object.keys(item);
                const values = Object.values(item);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
                const result = await pool.query(sql, values);
                const row = result.rows[0];
                insertedRows.push(row);
                // Async Sync to Supabase
                syncToSupabase(table, row);
            }
            res.status(201).json(insertedRows);
        } else {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
            
            const result = await pool.query(sql, values);
            const row = result.rows[0];

            // Async Sync to Supabase
            syncToSupabase(table, row);

            res.status(201).json(row);
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
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
        const result = await pool.query(sql, [...values, id]);
        const row = result.rows[0];

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
        const setClause = setKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');

        const whereKeys = Object.keys(filters);
        const whereValues = Object.values(filters);
        const whereClause = whereKeys.map((k, i) => `${k} = $${setKeys.length + i + 1}`).join(' AND ');

        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
        const result = await pool.query(sql, [...setValues, ...whereValues]);

        // Sync affected rows to Supabase
        if (result.rows.length > 0) {
            syncToSupabase(table, result.rows);
        }

        res.json({ updated: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE single row by id
app.delete('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    if (!validateTable(table, res)) return;
    try {
        await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);

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
            if (supabase) await supabase.from(table).delete().neq('id', 0); // Supabase delete all
            result = await pool.query(`DELETE FROM ${table}`);
        } else {
            const keys = Object.keys(filters);
            const values = Object.values(filters);
            const whereClause = keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');

            // Sync delete to Supabase
            if (supabase) {
                let query = supabase.from(table).delete();
                for (const [key, value] of Object.entries(filters)) {
                    query = query.eq(key, value);
                }
                await query;
            }

            result = await pool.query(`DELETE FROM ${table} WHERE ${whereClause}`, values);
        }
        res.json({ deleted: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY,
        initialized: !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
    });
});

app.listen(port, () => {
    console.log(`Egles SMIS server running on port ${port}`);
});
