const API_URL = '/api';

class QueryBuilder {
    constructor(tableName, key = null) {
        this.tableName = tableName;
        this.conditions = {};
        this.currentKey = key;
        this.isReverse = false;
        this.limitCount = null;
        this.filterFunc = null;
    }

    equals(value) {
        if (this.currentKey) {
            this.conditions[this.currentKey] = value;
            this.currentKey = null;
        }
        return this;
    }

    and(condition) {
        if (typeof condition === 'function') {
            this.filterFunc = condition;
        } else {
            Object.assign(this.conditions, condition);
        }
        return this;
    }

    reverse() {
        this.isReverse = true;
        return this;
    }

    limit(n) {
        this.limitCount = n;
        return this;
    }

    async toArray() {
        const params = { ...this.conditions };
        if (this.isReverse) {
            params._sort = 'id';
            params._order = 'desc';
        }
        if (this.limitCount) {
            params._limit = this.limitCount;
        }

        const queryStr = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/${this.tableName}?${queryStr}`);
        let data = await res.json();

        if (this.filterFunc) {
            data = data.filter(this.filterFunc);
        }

        // Normalize rows if table exists in db
        if (db[this.tableName] && db[this.tableName].normalize) {
            data = data.map(item => db[this.tableName].normalize(item));
        }

        return data;
    }

    async first() {
        this.limitCount = 1;
        const results = await this.toArray();
        return results.length > 0 ? results[0] : undefined;
    }

    async count() {
        const results = await this.toArray();
        return results.length;
    }

    async modify(changes) {
        const results = await this.toArray();
        for (const item of results) {
            await db[this.tableName].update(item.id, changes);
        }
        return { updated: results.length };
    }

    async delete() {
        const results = await this.toArray();
        for (const item of results) {
            await db[this.tableName].delete(item.id);
        }
        return { deleted: results.length };
    }
}

class TableProxy {
    constructor(tableName) {
        this.tableName = tableName;
        this.cache = null;
        this.lastFetch = 0;
        this.CACHE_TTL = 3000; // 3 seconds cache
    }

    clearCache() {
        this.cache = null;
        this.lastFetch = 0;
    }

    where(key) {
        return new QueryBuilder(this.tableName, key);
    }

    async toArray() {
        const now = Date.now();
        if (this.cache && (now - this.lastFetch < this.CACHE_TTL)) {
            return this.cache;
        }

        const results = await new QueryBuilder(this.tableName).toArray();
        this.cache = results.map(row => this.normalize(row));
        this.lastFetch = now;
        return this.cache;
    }

    normalize(row) {
        if (!row) return row;
        
        // Scrub corruption where literal "undefined" strings might exist
        for (let key in row) {
            if (row[key] === "undefined" || row[key] === "null") {
                row[key] = null;
            }
        }

        // Handle PostgreSQL lowercase column names (Reverse Mapping)
        if (row.studentid !== undefined && row.studentId === undefined) row.studentId = row.studentid;
        if (row.staffid !== undefined && row.staffId === undefined) row.staffId = row.staffid;
        if (row.teacherid !== undefined && row.teacherId === undefined) row.teacherId = row.teacherid;
        if (row.hostelid !== undefined && row.hostelId === undefined) row.hostelId = row.hostelid;
        if (row.routeid !== undefined && row.routeId === undefined) row.routeId = row.routeid;
        if (row.parentcontact !== undefined && row.parentContact === undefined) row.parentContact = row.parentcontact;
        
        return row;
    }

    async get(id) {
        // First try to find in cache
        if (this.cache) {
            const found = this.cache.find(item => item.id == id);
            if (found) return found;
        }

        const res = await fetch(`${API_URL}/${this.tableName}/${id}`);
        if (!res.ok) return undefined;
        const row = await res.json();
        return this.normalize(row);
    }

    async add(data) {
        this.clearCache();
        const res = await fetch(`${API_URL}/${this.tableName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    }

    async put(data) {
        this.clearCache();
        if (!data.id) return this.add(data);
        const res = await fetch(`${API_URL}/${this.tableName}/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    }

    async update(id, changes) {
        const item = await this.get(id);
        if (!item) return;
        return await this.put({ ...item, ...changes });
    }

    async delete(id) {
        this.clearCache();
        await fetch(`${API_URL}/${this.tableName}/${id}`, { method: 'DELETE' });
    }

    async count() {
        const results = await this.toArray();
        return results.length;
    }

    reverse() {
        return new QueryBuilder(this.tableName).reverse();
    }
}

const db = {
    students: new TableProxy('students'),
    attendance: new TableProxy('attendance'),
    fees: new TableProxy('fees'),
    marks: new TableProxy('marks'),
    staff: new TableProxy('staff'),
    subjects: new TableProxy('subjects'),
    assets: new TableProxy('assets'),
    library: new TableProxy('library'),
    bookLoans: new TableProxy('bookLoans'),
    discipline: new TableProxy('discipline'),
    health: new TableProxy('health'),
    payroll: new TableProxy('payroll'),
    expenses: new TableProxy('expenses'),
    notices: new TableProxy('notices'),
    hostels: new TableProxy('hostels'),
    hostelAssignments: new TableProxy('hostelAssignments'),
    transport: new TableProxy('transport'),
    transportAssignments: new TableProxy('transportAssignments'),
    notifications: new TableProxy('notifications'),
    users: new TableProxy('users'),
    publicSettings: new TableProxy('public_settings'),
    publicAchievements: new TableProxy('public_achievements'),
    publicCurriculum: new TableProxy('public_curriculum'),
    publicTestimonials: new TableProxy('public_testimonials')
};

console.log("PostgreSQL SMIS DB initialized");
