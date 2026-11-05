import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

import { createDatabase, type Database } from './database';

/**
 * Opens a SQLite database stored on the phone, through the
 * @capacitor-community/sqlite plugin. Each statement is sent with the plugin's
 * own transaction turned off: createDatabase decides where transactions
 * start and end.
 */
export async function openCapacitorDatabase(name: string): Promise<Database> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  // After a page reload the native side may still hold a connection the
  // JavaScript side forgot: this closes it so it can be created again.
  const { result: consistent } = await sqlite.checkConnectionsConsistency();
  const { result: exists } = await sqlite.isConnection(name, false);
  const connection =
    consistent && exists
      ? await sqlite.retrieveConnection(name, false)
      : await sqlite.createConnection(name, false, 'no-encryption', 1, false);

  if (!(await connection.isDBOpen()).result) {
    await connection.open();
  }

  return createDatabase({
    async run(sql, params = []) {
      const { changes } = await connection.run(sql, params, false);
      return { changes: changes?.changes ?? 0, lastId: changes?.lastId ?? 0 };
    },
    async query<T>(sql: string, params: unknown[] = []) {
      const { values } = await connection.query(sql, params);
      return (values ?? []) as T[];
    },
    async exec(sql) {
      await connection.execute(sql, false);
    },
    async begin() {
      await connection.beginTransaction();
    },
    async commit() {
      await connection.commitTransaction();
    },
    async rollback() {
      await connection.rollbackTransaction();
    },
  });
}
