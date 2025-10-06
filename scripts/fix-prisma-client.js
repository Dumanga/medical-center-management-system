const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'node_modules', '.prisma', 'client');
const prismaPackageDir = path.join(root, 'node_modules', '@prisma', 'client');
const destDir = path.join(prismaPackageDir, '.prisma');
const dest = path.join(destDir, 'client');

const copyRecursiveSync = (src, destPath) => {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, entry), path.join(destPath, entry));
    }
  } else {
    fs.copyFileSync(src, destPath);
  }
};

if (!fs.existsSync(sourceDir)) {
  console.warn(`[fix-prisma-client] Skipped: generated client folder not found at ${sourceDir}`);
  process.exit(0);
}

if (!fs.existsSync(prismaPackageDir)) {
  console.warn('[fix-prisma-client] Skipped: @prisma/client is not installed.');
  process.exit(0);
}

try {
  fs.mkdirSync(destDir, { recursive: true });
  if (fs.existsSync(dest)) {
    const stat = fs.lstatSync(dest);
    if (stat.isSymbolicLink()) {
      return;
    }
    fs.rmSync(dest, { recursive: true, force: true });
  }
  try {
    fs.symlinkSync(sourceDir, dest, 'junction');
    console.log(`[fix-prisma-client] Linked ${dest} -> ${sourceDir}`);
    process.exit(0);
  } catch (err) {
    if (err.code !== 'EPERM') {
      throw err;
    }
    console.warn('[fix-prisma-client] Symlink failed (probably due to permissions). Falling back to copying.');
  }
} catch (err) {
  if (err && err.code !== 'EEXIST') {
    console.error('[fix-prisma-client] Failed to prepare destination:', err);
    process.exit(1);
  }
}

copyRecursiveSync(sourceDir, dest);
console.log(`[fix-prisma-client] Copied generated client into ${dest}`);
