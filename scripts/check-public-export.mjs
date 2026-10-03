import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(process.argv[2] ?? 'dist');
const files = [];
function walk(dir) { for (const e of readdirSync(dir,{withFileTypes:true})) {
  const p = resolve(dir,e.name); if (e.isDirectory()) walk(p); else files.push(p);
} }
walk(root);
assert(files.some(p => p.endsWith('.hbc')),'iOS bundle missing');
assert(!files.some(p => /(?:courses|all_discs|course_holes)\.csv$/.test(p)),'Unapproved CSV asset in public bundle');
const metadata = readFileSync(resolve(root,'metadata.json'),'utf8');
assert(!/courses\.csv|all_discs\.csv|course_holes\.csv/.test(metadata),'Unapproved CSV in bundle metadata');
console.log('Public iOS export: bundle present; legacy course/disc/hole CSV assets absent PASS');
