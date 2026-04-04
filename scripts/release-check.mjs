import { spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const schemaArg = process.argv.find((argument) => argument.startsWith('--require-schema='));
const requiredSchema = schemaArg?.split('=')[1]?.trim();

function runStep(label, args, env = process.env) {
  const result = spawnSync(npmCommand, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
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
