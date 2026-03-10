import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

export interface ScanOptions {
  extensions?: string[];
  ignore?: string[];
}

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const DEFAULT_IGNORE = ['node_modules', 'dist', '.git', 'coverage', '.next', 'build'];

// Matches process.env.FOO or process.env['FOO'] or process.env["FOO"]
const ENV_PATTERN = /process\.env\.([A-Z_][A-Z0-9_]*)|process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]]/g;

export function scanFiles(dir: string, opts: ScanOptions = {}): string[] {
  const extensions = opts.extensions ?? DEFAULT_EXTENSIONS;
  const ignore = opts.ignore ?? DEFAULT_IGNORE;
  const found = new Set<string>();

  function walk(current: string): void {
    const entries = readdirSync(current);
    for (const entry of entries) {
      if (ignore.includes(entry)) continue;
      const fullPath = join(current, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (extensions.includes(extname(entry))) {
        scanFile(fullPath, found);
      }
    }
  }

  walk(dir);
  return [...found].sort();
}

export function scanContent(content: string): string[] {
  const found = new Set<string>();
  scanMatches(content, found);
  return [...found].sort();
}

function scanFile(filePath: string, found: Set<string>): void {
  try {
    const content = readFileSync(filePath, 'utf8');
    scanMatches(content, found);
  } catch {
    // skip unreadable files
  }
}

function scanMatches(content: string, found: Set<string>): void {
  const regex = new RegExp(ENV_PATTERN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1] ?? match[2];
    if (key) found.add(key);
  }
}
