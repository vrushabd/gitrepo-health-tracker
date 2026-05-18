import * as fs from 'fs/promises';
import * as path from 'path';
import { SUPPORTED_EXTENSIONS, TEST_PATTERNS } from '../types';

export async function getRepoMetrics(repoDir: string) {
  let codeFiles = 0;
  let testFiles = 0;
  
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name === 'target') continue;
      
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          const isTest = TEST_PATTERNS.some(p => fullPath.toLowerCase().includes(p));
          if (isTest) testFiles++;
          else codeFiles++;
        }
      }
    }
  }

  try {
    await walk(repoDir);
  } catch (e) {
    console.error('Error walking repo:', e);
  }

  let depCount = 0;

  // JS/TS
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(repoDir, 'package.json'), 'utf-8'));
    depCount += Object.keys(pkg.dependencies || {}).length;
    depCount += Object.keys(pkg.devDependencies || {}).length;
  } catch {}

  // Python
  try {
    const req = await fs.readFile(path.join(repoDir, 'requirements.txt'), 'utf-8');
    depCount += req.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
  } catch {}

  // Java Maven
  try {
    const pom = await fs.readFile(path.join(repoDir, 'pom.xml'), 'utf-8');
    depCount += (pom.match(/<dependency>/g) || []).length;
  } catch {}

  // Java Gradle
  try {
    const gradle = await fs.readFile(path.join(repoDir, 'build.gradle'), 'utf-8');
    depCount += (gradle.match(/implementation\s+['"]/g) || []).length;
    depCount += (gradle.match(/testImplementation\s+['"]/g) || []).length;
  } catch {}

  // Go
  try {
    const goMod = await fs.readFile(path.join(repoDir, 'go.mod'), 'utf-8');
    const inRequireBlock = goMod.match(/require\s*\(\n([\s\S]*?)\n\)/);
    if (inRequireBlock) {
      depCount += inRequireBlock[1].split('\n').filter(l => l.trim()).length;
    }
    depCount += (goMod.match(/^require\s+/gm) || []).length;
  } catch {}

  return { codeFiles, testFiles, depCount, totalFiles: codeFiles + testFiles };
}
