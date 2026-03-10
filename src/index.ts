#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { generateRawValidator, generateZodValidator } from './generator.js';
import { scanContent, scanFiles } from './scanner.js';

export { generateRawValidator, generateZodValidator, scanContent, scanFiles };
export type { GeneratorOptions } from './generator.js';
export type { ScanOptions } from './scanner.js';

const program = new Command();

program
  .name('env-validator-gen')
  .description('Scan source files for process.env usage and generate a validation schema')
  .version('1.0.0')
  .argument('[dir]', 'directory to scan', '.')
  .option('--out <file>', 'output file path (default: src/env.ts)')
  .option('--raw', 'generate a raw Node.js validator instead of a Zod schema')
  .option('--dotenv', 'add dotenv/config import to the generated file')
  .option('--print', 'print output to stdout instead of writing a file')
  .action((dir: string, opts: { out?: string; raw?: boolean; dotenv?: boolean; print?: boolean }) => {
    const scanDir = resolve(dir);

    let keys: string[];
    try {
      keys = scanFiles(scanDir);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`Error scanning ${scanDir}: ${msg}`));
      process.exit(1);
    }

    if (keys.length === 0) {
      console.log(pc.yellow('No process.env variables found in source files.'));
      process.exit(0);
    }

    const output = opts.raw
      ? generateRawValidator(keys)
      : generateZodValidator(keys, { withDotenvLoad: opts.dotenv });

    if (opts.print) {
      console.log(output);
      return;
    }

    const outPath = resolve(opts.out ?? 'src/env.ts');
    writeFileSync(outPath, output, 'utf8');
    console.log(pc.green(`✓ Generated ${outPath} (${keys.length} variables)`));
    console.log(pc.dim(`  Variables: ${keys.join(', ')}`));
  });

program.parse();
