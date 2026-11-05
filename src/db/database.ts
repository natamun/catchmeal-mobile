/** A value SQLite can store or receive as a parameter. */
export type SqlValue = string | number | null;

/** What a statement that changes data reports. */
export interface RunResult {
  /** Number of rows inserted, updated or deleted. */
  changes: number;
  /** Id of the last inserted row. */
  lastId: number;
}

/** The statements the app can send to SQLite. */
export interface Executor {
  /** Runs one statement that changes data, with `?` parameters. */
  run(sql: string, params?: SqlValue[]): Promise<RunResult>;
  /** Runs one query, with `?` parameters, and returns its rows. */
  query<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** Runs several statements separated by `;`, without parameters. */
  exec(sql: string): Promise<void>;
}

/**
 * The app's database. Operations run one at a time, in the order they were
 * called, so a transaction never mixes with statements from elsewhere.
 */
export interface Database extends Executor {
  /**
   * Runs `work` as one transaction: everything is saved, or nothing when it
   * throws. Inside `work`, use only `tx`: calling the database itself would
   * wait for the transaction to end, which never happens.
   */
  transaction<T>(work: (tx: Executor) => Promise<T>): Promise<T>;
}

/** The raw operations of a SQLite library, with no ordering of their own. */
export interface SqliteDriver extends Executor {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Builds the Database on top of a driver: the phone's SQLite plugin in the
 * app, SQLite in memory in the tests.
 */
export function createDatabase(driver: SqliteDriver): Database {
  let queue: Promise<unknown> = Promise.resolve();

  /** Starts `task` once every operation called before it has finished. */
  function inTurn<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
  }

  const tx: Executor = {
    run: (sql, params) => driver.run(sql, params),
    query: <T>(sql: string, params?: SqlValue[]) =>
      driver.query<T>(sql, params),
    exec: (sql) => driver.exec(sql),
  };

  return {
    run: (sql, params) => inTurn(() => driver.run(sql, params)),
    query: <T>(sql: string, params?: SqlValue[]) =>
      inTurn(() => driver.query<T>(sql, params)),
    exec: (sql) => inTurn(() => driver.exec(sql)),
    transaction: <T>(work: (tx: Executor) => Promise<T>) =>
      inTurn(async () => {
        await driver.begin();
        try {
          const result = await work(tx);
          await driver.commit();
          return result;
        } catch (error) {
          await driver.rollback().catch(() => undefined);
          throw error;
        }
      }),
  };
}
