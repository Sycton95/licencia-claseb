const baseUrl = process.env.RELEASE_CHECK_BASE_URL || 'https://licencia-claseb.vercel.app';
const base = new URL(baseUrl);
const schemaArg = process.argv.find((argument) => argument.startsWith('--require-schema='));
const requiredSchema =
  schemaArg?.split('=')[1]?.trim() || process.env.RELEASE_REQUIRED_SCHEMA?.trim();
const routes = ['/', '/practice', '/exam', '/admin', '/api/health'];

async function main() {
  const failures = [];

  for (const route of routes) {
    const urlObject = new URL(route, `${base.origin}/`);
    for (const [key, value] of base.searchParams.entries()) {
      urlObject.searchParams.set(key, value);
    }
    const url = urlObject.toString();

    try {
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        failures.push(`${route}: HTTP ${response.status}`);
        continue;
      }

      if (route === '/api/health') {
        const payload = await response.json();

        if (!payload.ok || !payload.databaseReachable) {
          failures.push(
            `${route}: health check inválido (${payload.error ?? 'sin detalle'})`,
          );
          continue;
        }

        if (requiredSchema && payload.schema !== requiredSchema) {
          failures.push(
            `${route}: schema esperado ${requiredSchema} y recibido ${payload.schema ?? 'desconocido'}`,
          );
        }
      }
    } catch (error) {
      failures.push(`${route}: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  if (requiredSchema) {
    console.log(`Smoke check passed for ${baseUrl} with schema ${requiredSchema}`);
    return;
  }

  console.log(`Smoke check passed for ${baseUrl}`);
}

main();
