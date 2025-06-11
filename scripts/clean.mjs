// /scripts/clean.mjs
import { readdir, stat, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const baseDirs = ['apps', 'packages'];
const targets = ['node_modules', 'dist', '.turbo'];
const isDryRun = process.argv.includes('--dry-run');

async function getSubdirectories(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

async function deleteIfExists(targetPath) {
  try {
    await stat(targetPath);
    if (isDryRun) {
      console.log(`🧐 [dry-run] Would delete: ${targetPath}`);
    } else {
      await rm(targetPath, { recursive: true, force: true });
      console.log(`🧹 Deleted: ${targetPath}`);
    }
  } catch {
    // Ignore if doesn't exist
  }
}

async function clean() {
  // Top-level folders
  for (const target of targets) {
    const targetPath = path.join(rootDir, target);
    await deleteIfExists(targetPath);
  }

  // apps/* and packages/*
  for (const base of baseDirs) {
    const fullBasePath = path.join(rootDir, base);
    const subDirs = await getSubdirectories(fullBasePath);
    for (const sub of subDirs) {
      for (const target of targets) {
        const targetPath = path.join(sub, target);
        await deleteIfExists(targetPath);
      }
    }
  }

  console.log(`✅ Clean ${isDryRun ? '(dry-run)' : ''} complete.`);
}

clean();
