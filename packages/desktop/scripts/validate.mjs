import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src-tauri/tauri.conf.json',
  'src-tauri/Cargo.toml',
  'src-tauri/src/main.rs',
  'src-tauri/src/lib.rs',
];

for (const rel of required) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    console.error(`Missing desktop shell file: ${rel}`);
    process.exit(1);
  }
}

const conf = JSON.parse(readFileSync(resolve(root, 'src-tauri/tauri.conf.json'), 'utf8'));
if (!conf.productName || !conf.identifier) {
  console.error('Invalid tauri.conf.json');
  process.exit(1);
}

console.log('Desktop shell validated (run pnpm build:tauri with Rust for native build)');
