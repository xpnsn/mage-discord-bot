'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * A tiny synchronous JSON-file-backed key/value store.
 *
 * Intentionally simple (no database) — this mirrors how the RSS feature
 * already persists its config in `data/rss.json`. Good enough for
 * per-guild settings; swap for a real database if this ever needs to
 * scale to many guilds or concurrent writers.
 */
class JsonStore {
    constructor(fileName, defaultValue = {}) {
        this.filePath = path.join(DATA_DIR, fileName);
        this.defaultValue = defaultValue;
        this._load();
    }

    _load() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify(this.defaultValue, null, 2));
        }

        try {
            this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        } catch (error) {
            console.error(`[JsonStore] Failed to parse ${this.filePath}, resetting to default.`, error);
            this.data = JSON.parse(JSON.stringify(this.defaultValue));
            this._save();
        }
    }

    _save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }

    get(key, fallback = undefined) {
        return this.data[key] ?? fallback;
    }

    set(key, value) {
        this.data[key] = value;
        this._save();
        return value;
    }

    delete(key) {
        if (!(key in this.data)) return false;
        delete this.data[key];
        this._save();
        return true;
    }

    all() {
        return this.data;
    }
}

module.exports = JsonStore;
