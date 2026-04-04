import { spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(label, args) {
  const result = spawnSync(npmCommand, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${label} falló con código ${result.status ?? 'desconocido'}.`);
  }
}

try {
  runStep('validate:content', ['run', 'validate:content']);
  runStep('build', ['run', 'build']);
  runStep('smoke:prod', ['run', 'smoke:prod']);
  console.log('Release check passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Release check failed.');
  process.exit(1);
}
