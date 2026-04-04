import { spawnSync } from 'node:child_process';

const npmExecPath = process.env.npm_execpath;
const schemaArg = process.argv.find((argument) => argument.startsWith('--require-schema='));
const requiredSchema = schemaArg?.split('=')[1]?.trim();

function runStep(label, args, env = process.env) {
  const useWindowsShell = process.platform === 'win32';
  const command = useWindowsShell ? 'npm' : npmExecPath ? process.execPath : 'npm';
  const commandArgs = useWindowsShell ? args : npmExecPath ? [npmExecPath, ...args] : args;

  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: useWindowsShell,
    env,
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
  runStep('typecheck:api', ['run', 'typecheck:api']);
  runStep(
    requiredSchema ? 'smoke:prod' : 'smoke:prod:compat',
    ['run', requiredSchema ? 'smoke:prod' : 'smoke:prod:compat'],
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
