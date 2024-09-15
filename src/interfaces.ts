/**
 * Key
 */
export type Key = string


/**
 * Tag
 */
export type Tag = string


/**
 * Field Name
 */
export type Field = string


/**
 * Key value pair
 */
export interface Item<T> {
    key: Key
    value: T | undefined
}


/**
 * Table row (internally used)
 */
export interface Record {
    key: Key
    value: Buffer | null,
    expires: number | null
}


/**
 * Time period in milliseconds before an entry written to the DB becomes invalid.
 *
 * "Time to live" in milliseconds. After this time,
 * the item becomes invalid and is deleted from the database
 * the next time it is accessed or when the application is started.
 * Set the value to 0 if you want to explicitly deactivate the process.
 */
export type TtlMs = number | undefined


/**
 * Specifies the maximum number of expiring entries that may be in the database.
 *
 * If there are more expiring items in the database than `MaxExpiringItems`,
 * the oldest items are deleted until there are only `MaxExpiringItems` items
 * with an expiration date in the database.
 */
export type MaxExpiringItems = number | undefined


/**
 * Database options
 */
export interface Options {
    /**
     * Open the database as read-only (default: false).
     */
    readonly?: boolean
    /**
     * Allow creating a new database (default: true).
     * If the database folder does not exist, it will be created.
     */
    create?: boolean
    /**
     * Open the database as read-write (default: true).
     */
    readwrite?: boolean
    /**
     * Default TTL milliseconds.
     * Standard time period in milliseconds before an entry written to the DB becomes invalid.
     */
    ttlMs?: TtlMs
    /**
     * Default value that specifies the maximum number of
     * expiring items that may be in the database.
     * Is used by the `deleteOldExpiringItems()` method as default value.
     */
    maxExpiringItemsInDb?: MaxExpiringItems
}
