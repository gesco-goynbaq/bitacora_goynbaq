// Genera supabase/02_semilla.sql a partir de js/seed.js.
// Uso: node herramientas/generar-semilla.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { COORDINACIONES, ANIO_PLAN } from '../js/seed.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const coords = COORDINACIONES.map((c, i) => `  (${q(c.nombre)}, ${q(c.categoria)}, ${i + 1})`).join(',\n');

const prios = COORDINACIONES.flatMap((c) =>
  c.prioridades.map((p, j) => `  (${q(c.nombre)}, ${q(p.nombre)}, ${q(p.resultado)}, ${q(p.producto)}, ${j + 1})`)
).join(',\n');

const sql = `-- =====================================================================
-- Bitácora GOYN BAQ · Semilla de la planeación ${ANIO_PLAN}
-- Generado desde js/seed.js con herramientas/generar-semilla.mjs. No editar a mano.
-- Ejecutar después de 01_esquema.sql. Se puede repetir sin duplicar.
-- =====================================================================

insert into public.coordinaciones (nombre, categoria, orden) values
${coords}
on conflict (nombre) do update set categoria = excluded.categoria, orden = excluded.orden;

insert into public.prioridades (coordinacion_id, nombre, resultado_esperado, producto_clave, orden, anio)
select c.id, v.nombre, v.resultado, v.producto, v.orden, ${ANIO_PLAN}
from (values
${prios}
) as v (coordinacion, nombre, resultado, producto, orden)
join public.coordinaciones c on c.nombre = v.coordinacion
on conflict (coordinacion_id, nombre, anio) do update
  set resultado_esperado = excluded.resultado_esperado,
      producto_clave     = excluded.producto_clave,
      orden              = excluded.orden;
`;

writeFileSync(join(raiz, 'supabase', '02_semilla.sql'), sql);
console.log(`Semilla generada: ${COORDINACIONES.length} coordinaciones, ${COORDINACIONES.reduce((n, c) => n + c.prioridades.length, 0)} prioridades.`);
