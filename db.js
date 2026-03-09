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
            // Not strictly used, but good to have
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
        // Construct query string
        const params = { ...this.conditions };
        if (this.isReverse) {
            params._sort = 'id';
            params._order = 'desc';
        }
        if (this.limitCount) {
            params._limit = this.limitCount;
        }

        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/${this.tableName}?${query}`);
        let data = await res.json();

        if (this.filterFunc) {
            data = data.filter(this.filterFunc);
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
        const query = new URLSearchParams(this.conditions).toString();
        const res = await fetch(`${API_URL}/bulk/${this.tableName}?${query}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes)
        });
        return res.json();
    }

    async delete() {
        const query = new URLSearchParams(this.conditions).toString();
        const res = await fetch(`${API_URL}/bulk/${this.tableName}?${query}`, {
            method: 'DELETE'
        });
        return res.json();
    }
}

class TableProxy {
    constructor(tableName) {
        this.tableName = tableName;
    }

    where(key) {
        return new QueryBuilder(this.tableName, key);
    }

    async toArray() {
        const res = await fetch(`${API_URL}/${this.tableName}`);
        return await res.json();
    }

    async get(id) {
        const res = await fetch(`${API_URL}/${this.tableName}/${id}`);
        if (!res.ok) return undefined;
        return await res.json();
    }

    async add(data) {
        const res = await fetch(`${API_URL}/${this.tableName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    }

    async put(data) {
        if (data.id) {
            const res = await fetch(`${API_URL}/${this.tableName}/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await res.json();
        } else {
            return this.add(data);
        }
    }

    async update(id, changes) {
        const item = await this.get(id);
        if (!item) return;
        return await this.put({ ...item, ...changes });
    }

    async delete(id) {
        await fetch(`${API_URL}/${this.tableName}/${id}`, { method: 'DELETE' });
    }

    async count() {
        const res = await fetch(`${API_URL}/${this.tableName}`);
        const data = await res.json();
        return data.length;
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
    timetable: new TableProxy('timetable'),
    library: new TableProxy('library'),
    bookLoans: new TableProxy('bookLoans'),
    discipline: new TableProxy('discipline'),
    health: new TableProxy('health'),
    payroll: new TableProxy('payroll'),
    pos: new TableProxy('pos'),
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

console.log("PostgreSQL/Express Compat DB initialized");
