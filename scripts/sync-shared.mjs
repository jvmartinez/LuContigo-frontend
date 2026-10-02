// Copia los esquemas compartidos del backend (`src/shared`) a `src/shared`.
// Hace el papel de `packages/shared` mientras web y API viven en repositorios separados.
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const origen = resolve(process.env.BACKEND_DIR ?? '../LuContigo-backend', 'src/shared');
const destino = resolve('src/shared');

if (!existsSync(origen)) {
  console.error(`No encuentro ${origen}. Define BACKEND_DIR con la ruta del backend.`);
  process.exit(1);
}

for (const archivo of readdirSync(origen)) {
  if (!archivo.endsWith('.ts')) continue;
  // Las pruebas del backend (Jest, *.spec.ts) corren aquí con Vitest como *.test.ts.
  const nombre = archivo.replace(/\.spec\.ts$/, '.test.ts');
  copyFileSync(join(origen, archivo), join(destino, nombre));
  console.log(`✓ ${archivo} → src/shared/${nombre}`);
}
