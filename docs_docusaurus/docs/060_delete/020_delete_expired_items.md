# Delete Expired Items

```typescript
deleteExpired()
```

Deletes all expired items. 
These are items whose TTL (Time to live) has expired.
These items are not deleted continuously, 
but only when they are accessed directly or when the database is opened.
If you want to delete the expired items in between, 
you can do this with `deleteExpired()`.
