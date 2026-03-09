require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend static files

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Generic GET with optional query filters
app.get('/api/:table', async (req, res) => {
    const { table } = req.params;
    const queryParams = req.query;

    try {
        let sql = `SELECT * FROM "${table}"`;
        const values = [];

        if (Object.keys(queryParams).length > 0) {
            const conditions = [];
            let i = 1;
            for (const [key, value] of Object.entries(queryParams)) {
                if (key === '_limit') continue;
                if (key === '_sort') continue;
                if (key === '_order') continue;
                conditions.push(`"${key}" = $${i}`);
                values.push(value);
                i++;
            }

            if (conditions.length > 0) {
                sql += ` WHERE ` + conditions.join(' AND ');
            }

            if (queryParams._sort) {
                const order = queryParams._order && queryParams._order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
                sql += ` ORDER BY "${queryParams._sort}" ${order}`;
            }
            if (queryParams._limit) {
                sql += ` LIMIT $${i}`;
                values.push(parseInt(queryParams._limit));
            }
        }

        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error(`Error fetching from ${table}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Generic GET single item by ID
app.get('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;

    try {
        const sql = `SELECT * FROM "${table}" WHERE id = $1`;
        const result = await pool.query(sql, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generic POST
app.post('/api/:table', async (req, res) => {
    const { table } = req.params;
    const data = req.body;

    if (Array.isArray(data)) {
        // Bulk insert
        try {
            // A simple approach for bulk insert: loop over them. (In production, use UNNEST or batch queries)
            const results = [];
            for (const row of data) {
                const keys = Object.keys(row);
                const values = Object.values(row);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const sql = `INSERT INTO "${table}" ("${keys.join('", "')}") VALUES (${placeholders}) RETURNING *`;
                const result = await pool.query(sql, values);
                results.push(result.rows[0]);
            }
            return res.status(201).json(results);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    } else {
        // Single insert
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const sql = `INSERT INTO "${table}" ("${keys.join('", "')}") VALUES (${placeholders}) RETURNING *`;
            const result = await pool.query(sql, values);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(`Error inserting into ${table}:`, err.message);
            res.status(500).json({ error: err.message });
        }
    }
});

// Generic PUT
app.put('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const data = req.body;

    try {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(', ');
        const sql = `UPDATE "${table}" SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;

        // Add id to end of values array
        values.push(id);

        const result = await pool.query(sql, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk Modify (Generic PUT based on query parameters instead of ID)
// Dexie's db.notifications.where('read').equals(0).modify({ read: 1 });
app.put('/api/bulk/:table', async (req, res) => {
    const { table } = req.params;
    const queryParams = req.query; // e.g., ?read=0
    const updateData = req.body;   // e.g., { read: 1 }

    if (Object.keys(queryParams).length === 0) {
        return res.status(400).json({ error: "Bulk update requires condition parameters" });
    }

    try {
        const updateKeys = Object.keys(updateData);
        let valueIndex = 1;

        const setClause = updateKeys.map(key => `"${key}" = $${valueIndex++}`).join(', ');
        const values = Object.values(updateData);

        const conditions = [];
        for (const [key, value] of Object.entries(queryParams)) {
            conditions.push(`"${key}" = $${valueIndex++}`);
            values.push(value);
        }

        const sql = `UPDATE "${table}" SET ${setClause} WHERE ${conditions.join(' AND ')} RETURNING *`;
        const result = await pool.query(sql, values);

        res.json({ updated: result.rowCount, records: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generic DELETE
app.delete('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;

    try {
        const sql = `DELETE FROM "${table}" WHERE id = $1 RETURNING *`;
        const result = await pool.query(sql, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generic DELETE with filters (Bulk delete)
app.delete('/api/bulk/:table', async (req, res) => {
    const { table } = req.params;
    const queryParams = req.query;

    if (Object.keys(queryParams).length === 0) {
        // Optionally prevent delete all, or allow it. Let's allow it for "clear()" equivalents.
        try {
            const result = await pool.query(`DELETE FROM "${table}"`);
            return res.json({ deleted: result.rowCount });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    try {
        const conditions = [];
        const values = [];
        let i = 1;

        for (const [key, value] of Object.entries(queryParams)) {
            conditions.push(`"${key}" = $${i}`);
            values.push(value);
            i++;
        }

        const sql = `DELETE FROM "${table}" WHERE ${conditions.join(' AND ')}`;
        const result = await pool.query(sql, values);
        res.json({ deleted: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
