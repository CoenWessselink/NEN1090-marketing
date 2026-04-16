import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyFile(rel){
  const src = path.join(root, rel);
  const dest = path.join(dist, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
function copyDir(rel){
  const src = path.join(root, rel);
  const dest = path.join(dist, rel);
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(path.join(rel, entry.name));
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const files = ['index.html','pricing.html','onboarding.html','contact.html','software.html','privacy.html','security.html','404.html'];
for (const rel of files) if (fs.existsSync(path.join(root, rel))) copyFile(rel);
for (const rel of ['assets','features','legal','public']) if (fs.existsSync(path.join(root, rel))) copyDir(rel);
if (fs.existsSync(path.join(dist, 'public'))) {
  for (const entry of fs.readdirSync(path.join(dist, 'public'))) {
    fs.copyFileSync(path.join(dist, 'public', entry), path.join(dist, entry));
  }
}
console.log('static-build: dist generated');
