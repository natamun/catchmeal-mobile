import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { createDatabase, type Database } from '../db/database';

/**
 * A database in memory, with the SQLite built into Node, for the tests. It
 * goes through the same createDatabase as the app, so the SQL and the
 * transactions tested here are the ones the phone runs.
 */
export function openMemoryDatabase(): Database {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');

  return createDatabase({
    run(sql, params = []) {
      const result = sqlite.prepare(sql).run(...(params as SQLInputValue[]));
      return Promise.resolve({
        changes: Number(result.changes),
        lastId: Number(result.lastInsertRowid),
      });
    },
    query<T>(sql: string, params: unknown[] = []) {
      const rows = sqlite.prepare(sql).all(...(params as SQLInputValue[]));
      return Promise.resolve(rows.map((row) => ({ ...row })) as T[]);
    },
    exec(sql) {
      sqlite.exec(sql);
      return Promise.resolve();
    },
    begin() {
      sqlite.exec('BEGIN');
      return Promise.resolve();
    },
    commit() {
      sqlite.exec('COMMIT');
      return Promise.resolve();
    },
    rollback() {
      sqlite.exec('ROLLBACK');
      return Promise.resolve();
    },
  });
}
