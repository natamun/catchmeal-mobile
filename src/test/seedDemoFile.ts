/**
 * Writes the demo database to the file given as argument, for `make seed`:
 * node --import ./src/test/ts-resolve.mjs src/test/seedDemoFile.ts <file>
 */
import { rmSync } from 'node:fs';

import { migrate } from '../db/migrations';
import { seedDemo } from './demoSeed';
import { openNodeDatabase } from './nodeDatabase';

const path = process.argv[2];
if (!path) throw new Error('Usage: seedDemoFile.ts <file>');

rmSync(path, { force: true });
const db = openNodeDatabase(path);
await migrate(db);
await seedDemo(db);
