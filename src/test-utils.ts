import { N2DB } from './storage/db';

export function testDb(): N2DB {
  return new N2DB(`test-${Math.random().toString(36).slice(2)}`);
}
