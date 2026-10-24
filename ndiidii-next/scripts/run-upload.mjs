import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const out = [];
const err = [];

const child = spawn('node', ['scripts/upload-cloudinary.mjs'], {
  cwd: 'C:\\Users\\Cicada\\Desktop\\code\\Ndiidii_proj\\ndiidii_scents_app\\ndiidii-next',
  shell: true,
});

child.stdout.on('data', (d) => {
  const text = d.toString();
  out.push(text);
});

child.stderr.on('data', (d) => {
  const text = d.toString();
  err.push(text);
});

child.on('close', (code) => {
  const stdout = out.join('');
  const stderr = err.join('');
  writeFileSync('C:\\Users\\Cicada\\Desktop\\code\\Ndiidii_proj\\ndiidii_scents_app\\ndiidii-next\\data\\upload-cloudinary-run.log', JSON.stringify({ code, stdout, stderr }, null, 2));
  console.log('exit', code);
});
