import { spawnSync } from 'node:child_process';

const npmExecPath = process.env.npm_execpath;
const schemaArg = process.argv.find((argument) => argument.startsWith('--require-schema='));
const requiredSchema = schemaArg?.split('=')[1]?.trim();

function sanitizeChildEnv(env = process.env) {
  const childEnv = { ...env };

  for (const key of Object.keys(childEnv)) {
    if (key.toLowerCase().startsWith('npm_')) {
      delete childEnv[key];
    }
  }

  return childEnv;
}

function runStep(label, args, env = process.env) {
  const usePowerShell = process.platform === 'win32';
  const command = usePowerShell
    ? 'powershell.exe'
    : npmExecPath
      ? process.execPath
      : 'npm';
  const commandArgs = usePowerShell
    ? ['-NoProfile', '-Command', `npm ${args.join(' ')}`]
    : npmExecPath
      ? [npmExecPath, ...args]
      : args;

  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: false,
    env: sanitizeChildEnv(env),
  });

  if (result.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status ?? 'unknown'}.`);
  }
}

try {
  runStep('validate:content', ['run', 'validate:content']);
  runStep('build', ['run', 'build']);
  runStep(
    'smoke:prod',
    ['run', 'smoke:prod'],
    requiredSchema
      ? {
          ...process.env,
          RELEASE_REQUIRED_SCHEMA: requiredSchema,
        }
      : process.env,
  );
  console.log('Release check passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Release check failed.');
  process.exit(1);
}
