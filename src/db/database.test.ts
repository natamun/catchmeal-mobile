import { beforeEach, describe, expect, it } from 'vitest';

import { openMemoryDatabase } from '../test/nodeDatabase';
import type { Database } from './database';

let db: Database;

beforeEach(async () => {
  db = openMemoryDatabase();
  await db.exec('CREATE TABLE item (id INTEGER PRIMARY KEY, name TEXT)');
});

const countItems = async () =>
  (await db.query<{ n: number }>('SELECT count(*) AS n FROM item'))[0].n;

describe('transaction', () => {
  it('saves every statement when the work succeeds', async () => {
    const result = await db.transaction(async (tx) => {
      await tx.run('INSERT INTO item (name) VALUES (?)', ['a']);
      await tx.run('INSERT INTO item (name) VALUES (?)', ['b']);
      return 'done';
    });

    expect(result).toBe('done');
    expect(await countItems()).toBe(2);
  });

  it('saves nothing and rethrows when the work fails', async () => {
    const failing = db.transaction(async (tx) => {
      await tx.run('INSERT INTO item (name) VALUES (?)', ['a']);
      throw new Error('boom');
    });

    await expect(failing).rejects.toThrow('boom');
    expect(await countItems()).toBe(0);
  });

  it('saves nothing when a statement is refused by SQLite', async () => {
    const failing = db.transaction(async (tx) => {
      await tx.run('INSERT INTO item (name) VALUES (?)', ['a']);
      await tx.run('INSERT INTO missing (name) VALUES (?)', ['b']);
    });

    await expect(failing).rejects.toThrow();
    expect(await countItems()).toBe(0);
  });

  it('makes calls made meanwhile wait until it ends', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));

    const transaction = db.transaction(async (tx) => {
      await tx.run('INSERT INTO item (name) VALUES (?)', ['a']);
      await gate;
      await tx.run('INSERT INTO item (name) VALUES (?)', ['b']);
    });
    const countDuring = countItems();
    release();

    await transaction;
    expect(await countDuring).toBe(2);
  });
});

describe('run', () => {
  it('reports the inserted id and the number of changed rows', async () => {
    const first = await db.run('INSERT INTO item (name) VALUES (?)', ['a']);
    await db.run('INSERT INTO item (name) VALUES (?)', ['b']);
    const update = await db.run('UPDATE item SET name = ?', ['c']);

    expect(first).toEqual({ changes: 1, lastId: 1 });
    expect(update.changes).toBe(2);
  });
});
