import { Database, type Statement } from "bun:sqlite"
import { dirname, resolve } from "node:path"
import { existsSync, mkdirSync } from "node:fs"
import type { DbOptions, Key, Record } from "./interfaces.ts"


export function getDatabase(filename: string, dbOptions: DbOptions): Database {

    // Create database directory
    if (filename?.length && filename.toLowerCase() !== ":memory:" && dbOptions.create) {
        const dbDir = dirname(resolve(filename))
        if (!existsSync(dbDir)) {
            console.log(`The "${dbDir}" folder is created.`)
            mkdirSync(dbDir, {recursive: true})
        }
    }

    const db = new Database(filename, dbOptions)

    db.run("PRAGMA journal_mode = WAL")
    db.run("PRAGMA foreign_keys = ON")

    // Create items table
    db.run(`
        CREATE TABLE IF NOT EXISTS items (
            key TEXT NOT NULL PRIMARY KEY, 
            value BLOB, 
            expires INT
        ) STRICT
    `)
    db.run(`
        CREATE INDEX IF NOT EXISTS ix_items_expires ON items (expires)
    `)

    // Create tags table
    db.run(`
        CREATE TABLE IF NOT EXISTS tags (
            tag TEXT NOT NULL,
            item_key TEXT NOT NULL REFERENCES items ON DELETE CASCADE ON UPDATE CASCADE,
            PRIMARY KEY (tag, item_key)
        ) STRICT
    `)
    db.run(`
        CREATE INDEX IF NOT EXISTS ix_tags_item_key ON tags (item_key)
    `)

    return db
}


export function getStatements(db: Database) {
    return {
        clear: db.query(`
            DELETE FROM items
        `) as Statement,

        delete: db.query(`
            DELETE FROM items 
            WHERE key = $key
        `) as Statement,

        deleteExpired: db.query(`
            DELETE FROM items 
            WHERE expires < $now
        `) as Statement,

        setItem: db.query(`
            INSERT OR REPLACE INTO items (
                key, value, expires
            ) VALUES (
                $key, $value, $expires
            )
        `) as Statement,

        count: db.query(`
            SELECT COUNT(*) AS count 
            FROM items
        `) as Statement<{count: number}>,

        countValid: db.query(`
            SELECT COUNT(*) AS count 
            FROM items 
            WHERE expires IS NULL OR expires > $now
        `) as Statement<{count: number}>,

        getAllItems: db.query(`
            SELECT key, value, expires 
            FROM items
        `) as Statement<Record>,

        getItem: db.query(`
            SELECT value, expires 
            FROM items 
            WHERE key = $key
        `) as Statement<Omit<Record, "key">>,

        getItemsStartsWith: db.query(`
            SELECT key, value, expires 
            FROM items 
            WHERE key = $key OR key >= $gte AND key < $lt
        `) as Statement<Record>,
        // gte = key + MIN_UTF8_CHAR
        // lt = key + MAX_UTF8_CHAR

        getAllKeys: db.query(`
            SELECT key, expires 
            FROM items
        `) as Statement<Omit<Record, "value">>,

        getKey: db.query(`
            SELECT expires 
            FROM items 
            WHERE key = $key
        `) as Statement<Omit<Record, "key" | "value">>,

        getKeysStartsWith: db.query(`
            SELECT key, expires 
            FROM items 
            WHERE key = $key OR key >= $gte AND key < $lt
        `) as Statement<Omit<Record, "value">>,

        countExpiring: db.query(`
            SELECT COUNT(*) as count 
            FROM items 
            WHERE expires IS NOT NULL
        `) as Statement<{count: number}>,

        deleteExpiring: db.query(`
            DELETE FROM items 
            WHERE key IN (
                SELECT key 
                FROM items
                WHERE expires IS NOT NULL
                ORDER BY expires ASC
                LIMIT $limit
            )
        `) as Statement,

        getRandomKey: db.query(`
            SELECT key 
            FROM items 
            WHERE expires IS NULL OR expires > $now
            ORDER BY RANDOM() 
            LIMIT 1
        `) as Statement<Omit<Record, "value" | "expires">>,

        getRandomItem: db.query(`
            SELECT key, value 
            FROM items
            WHERE key = (
                SELECT key 
                FROM items 
                WHERE expires IS NULL OR expires > $now
                ORDER BY RANDOM() 
                LIMIT 1
            )
        `) as Statement<Omit<Record, "expires">>,

        rename: db.query(`
            UPDATE items 
            SET key = $newKey 
            WHERE key = $oldKey
        `) as Statement,

        setExpires: db.query(`
            UPDATE items 
            SET expires = $expires 
            WHERE key = $key
        `) as Statement,

        getExpires: db.query(`
            SELECT expires 
            FROM items 
            WHERE key = $key
        `) as Statement<{expires: number}>,

        addTag: db.query(`
            INSERT OR IGNORE INTO tags (
                tag, item_key
            ) VALUES (
                $tag, $item_key
            )
        `) as Statement,

        deleteTag: db.query(`
            DELETE FROM tags 
            WHERE tag = $tag AND item_key = $key
        `) as Statement,

        deleteAllTags: db.query(`
            DELETE FROM tags 
            WHERE item_key = $key
        `) as Statement,

        getTaggedKeys: db.query(`
            SELECT item_key AS key 
            FROM tags 
            WHERE tag = $tag
        `) as Statement<{key: Key}>,

        deleteTaggedItems: db.query(`
            DELETE FROM items 
            WHERE key IN (
                SELECT item_key 
                FROM tags 
                WHERE tag = $tag
            )
        `) as Statement,

    }
}
