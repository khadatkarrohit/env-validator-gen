import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { scanContent, scanFiles } from '../src/scanner.ts';

describe('scanContent', () => {
  it('finds process.env.FOO dot notation', () => {
    const result = scanContent('const x = process.env.DATABASE_URL;');
    assert.deepEqual(result, ['DATABASE_URL']);
  });

  it('finds process.env["FOO"] bracket notation with double quotes', () => {
    const result = scanContent('const x = process.env["JWT_SECRET"];');
    assert.deepEqual(result, ['JWT_SECRET']);
  });

  it('finds process.env[\'FOO\'] bracket notation with single quotes', () => {
    const result = scanContent("const x = process.env['PORT'];");
    assert.deepEqual(result, ['PORT']);
  });

  it('deduplicates repeated variables', () => {
    const content = 'process.env.DB_URL; process.env.DB_URL; process.env.DB_URL;';
    const result = scanContent(content);
    assert.deepEqual(result, ['DB_URL']);
  });

  it('returns results in sorted order', () => {
    const content = 'process.env.PORT; process.env.DATABASE_URL; process.env.API_KEY;';
    const result = scanContent(content);
    assert.deepEqual(result, ['API_KEY', 'DATABASE_URL', 'PORT']);
  });

  it('ignores lowercase env keys', () => {
    const result = scanContent('process.env.lowercase_key;');
    assert.deepEqual(result, []);
  });

  it('handles multiple vars in one file', () => {
    const content = `
      const a = process.env.SMTP_HOST;
      const b = process.env['SMTP_USER'];
      const c = process.env["SMTP_PASS"];
    `;
    const result = scanContent(content);
    assert.deepEqual(result, ['SMTP_HOST', 'SMTP_PASS', 'SMTP_USER']);
  });

  it('returns empty array for content with no process.env', () => {
    const result = scanContent('const x = 42; const y = "hello";');
    assert.deepEqual(result, []);
  });
});

describe('scanFiles', () => {
  it('scans a directory and finds all env vars across files', () => {
    const dir = resolve('fixtures/src');
    const result = scanFiles(dir);
    assert.ok(result.includes('DATABASE_URL'));
    assert.ok(result.includes('JWT_SECRET'));
    assert.ok(result.includes('PORT'));
    assert.ok(result.includes('SMTP_HOST'));
    assert.ok(result.includes('SMTP_USER'));
    assert.ok(result.includes('SMTP_PASS'));
  });

  it('deduplicates vars found across multiple files', () => {
    const dir = resolve('fixtures/src');
    const result = scanFiles(dir);
    const dbCount = result.filter((k) => k === 'DATABASE_URL').length;
    assert.equal(dbCount, 1);
  });

  it('returns results in sorted order', () => {
    const dir = resolve('fixtures/src');
    const result = scanFiles(dir);
    const sorted = [...result].sort();
    assert.deepEqual(result, sorted);
  });
});
