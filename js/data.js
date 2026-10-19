// Capa de datos: la misma interfaz para el modo demostración (navegador)
// y para Supabase. La interfaz de usuario solo habla con `api`.

import { CONFIG } from './config.js';
import { COORDINACIONES, ANIO_PLAN } from './seed.js';

export const modoDemo = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;
export const CODIGO_DEMO = '123456';

const dominioRe = new RegExp(`^[^@\\s]+@${CONFIG.DOMINIO.replace(/\./g, '\\.')}$`, 'i');
export const correoValido = (correo) => dominioRe.test(String(correo || '').trim());

const TABLAS = ['perfiles', 'coordinaciones', 'prioridades', 'acciones', 'hitos', 'reportes'];

// ---------------------------------------------------------------------
// Modo demostración
// ---------------------------------------------------------------------

const CLAVE = 'bitacora-goynbaq-demo-v1';
const CLAVE_SESION = 'bitacora-goynbaq-demo-sesion';
const uid = () => crypto.randomUUID();
const ahora = () => new Date().toISOString();

function sembrar() {
  const d = { perfiles: [], coordinaciones: [], prioridades: [], acciones: [], hitos: [], reportes: [] };
  COORDINACIONES.forEach((c, i) => {
    const cid = uid();
    d.coordinaciones.push({ id: cid, nombre: c.nombre, categoria: c.categoria, orden: i + 1 });
    c.prioridades.forEach((p, j) => {
      d.prioridades.push({
        id: uid(), coordinacion_id: cid, nombre: p.nombre, resultado_esperado: p.resultado,
        producto_clave: p.producto, anio: ANIO_PLAN, orden: j + 1,
      });
    });
  });
  // Una acción de ejemplo para que la demostración no arranque vacía.
  const infra = d.prioridades.find((p) => p.nombre === 'Infraestructura de datos');
  const aid = uid();
  d.acciones.push({
    id: aid, prioridad_id: infra.id, nombre: 'Lanzar la Bitácora GOYN BAQ al equipo',
    descripcion: 'Acción de ejemplo para probar la plataforma. Puedes editarla o eliminarla.',
    responsable_id: null, fecha_inicio: '2027-01-15', fecha_fin: '2027-04-30', estado: 'en_curso',
    presupuesto_planeado: 0, presupuesto_ejecutado: 0, fuente_financiacion: '', creado: ahora(),
  });
  [
    ['Modelo de datos y permisos definidos', 'T1', '2027-01-29', true],
    ['Maqueta revisada con las coordinaciones', 'T1', '2027-02-26', false],
    ['Plan 2027 cargado por las ocho coordinaciones', 'T1', '2027-03-31', false],
    ['Primer reporte trimestral desde la plataforma', 'T2', '2027-04-30', false],
  ].forEach(([nombre, trimestre, fecha_limite, cumplido]) => {
    d.hitos.push({
      id: uid(), accion_id: aid, nombre, trimestre, fecha_limite, responsable_id: null, cumplido,
      fecha_cumplido: cumplido ? fecha_limite : null, evidencia_url: '', creado: ahora(),
    });
  });
  return d;
}

function leerDemo() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (d && TABLAS.every((t) => Array.isArray(d[t]))) return d;
  } catch { /* datos dañados: se vuelve a sembrar */ }
  const d = sembrar();
  localStorage.setItem(CLAVE, JSON.stringify(d));
  return d;
}
const escribirDemo = (d) => localStorage.setItem(CLAVE, JSON.stringify(d));
const pausa = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const demo = {
  async sesion() {
    try { return JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null'); } catch { return null; }
  },
  async enviarCodigo(correo) {
    if (!correoValido(correo)) throw new Error(`Usa tu correo @${CONFIG.DOMINIO}.`);
    await pausa();
  },
  async verificarCodigo(correo, codigo) {
    await pausa();
    if (String(codigo).trim() !== CODIGO_DEMO) throw new Error('El código no coincide. Revisa el correo e inténtalo de nuevo.');
    const d = leerDemo();
    const email = correo.trim().toLowerCase();
    let p = d.perfiles.find((x) => x.email === email);
    if (!p) {
      // En la demostración, la primera persona en entrar administra.
      p = { id: uid(), email, nombre: '', cargo: '', coordinacion_id: null,
            rol: d.perfiles.length ? 'miembro' : 'admin', creado: ahora() };
      d.perfiles.push(p);
      const ejemplo = d.acciones.find((a) => a.nombre === 'Lanzar la Bitácora GOYN BAQ al equipo');
      if (ejemplo && !ejemplo.responsable_id) {
        ejemplo.responsable_id = p.id;
        d.hitos.filter((h) => h.accion_id === ejemplo.id).forEach((h) => { h.responsable_id = p.id; });
      }
      escribirDemo(d);
    }
    const s = { user: { id: p.id, email } };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
    return s;
  },
  async salir() { localStorage.removeItem(CLAVE_SESION); },
  async cargarTodo() { await pausa(80); return structuredClone(leerDemo()); },
  async guardarPerfil(id, campos) {
    const d = leerDemo();
    const p = d.perfiles.find((x) => x.id === id);
    Object.assign(p, campos, { actualizado: ahora() });
    escribirDemo(d);
  },
  async guardar(tabla, registro) {
    await pausa(120);
    const d = leerDemo();
    if (registro.id) {
      const fila = d[tabla].find((x) => x.id === registro.id);
      if (!fila) throw new Error('El registro ya no existe.');
      Object.assign(fila, registro, { actualizado: ahora() });
    } else {
      d[tabla].push({ ...registro, id: uid(), creado: ahora() });
    }
    escribirDemo(d);
  },
  async eliminar(tabla, id) {
    const d = leerDemo();
    d[tabla] = d[tabla].filter((x) => x.id !== id);
    if (tabla === 'acciones') {
      d.hitos = d.hitos.filter((h) => h.accion_id !== id);
      d.reportes = d.reportes.filter((r) => r.accion_id !== id);
    }
    escribirDemo(d);
  },
  reiniciarDemo() { localStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE_SESION); },
};

// ---------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------

let cliente = null;
async function sb() {
  if (cliente) return cliente;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  cliente = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
  });
  return cliente;
}

const traducir = (error) => {
  const m = error?.message || String(error);
  if (/row-level security/i.test(m)) return 'No tienes permiso para hacer este cambio.';
  if (/rate limit|too many/i.test(m)) return 'Se enviaron demasiados códigos. Espera unos minutos e inténtalo de nuevo.';
  if (/expired|invalid/i.test(m) && /token|otp/i.test(m)) return 'El código venció o no es válido. Pide uno nuevo.';
  if (/goynbarranquilla/i.test(m)) return m;
  return m;
};
const ok = ({ data, error }) => { if (error) throw new Error(traducir(error)); return data; };

const nube = {
  async sesion() {
    const c = await sb();
    const { data } = await c.auth.getSession();
    // Limpia el ?code= que deja el enlace mágico.
    if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
    return data.session ? { user: { id: data.session.user.id, email: data.session.user.email } } : null;
  },
  async enviarCodigo(correo) {
    if (!correoValido(correo)) throw new Error(`Usa tu correo @${CONFIG.DOMINIO}.`);
    const c = await sb();
    ok(await c.auth.signInWithOtp({
      email: correo.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname },
    }));
  },
  async verificarCodigo(correo, codigo) {
    const c = await sb();
    const data = ok(await c.auth.verifyOtp({ email: correo.trim().toLowerCase(), token: String(codigo).trim(), type: 'email' }));
    return { user: { id: data.user.id, email: data.user.email } };
  },
  async salir() { const c = await sb(); await c.auth.signOut(); },
  async cargarTodo() {
    const c = await sb();
    const res = await Promise.all(TABLAS.map((t) => c.from(t).select('*')));
    const d = {};
    TABLAS.forEach((t, i) => { d[t] = ok(res[i]) || []; });
    return d;
  },
  async guardarPerfil(id, campos) {
    const c = await sb();
    const { data: u } = await c.auth.getUser();
    // upsert: si el disparador no creó el perfil, se crea aquí.
    const filas = ok(await c.from('perfiles').upsert({ id, email: u.user.email.toLowerCase(), ...campos }).select('id'));
    if (!filas?.length) throw new Error('No se pudo guardar el perfil.');
  },
  async guardar(tabla, registro) {
    const c = await sb();
    const { id, creado, actualizado, ...campos } = registro;
    // Con RLS, un cambio sin permiso no da error: devuelve cero filas.
    const filas = id
      ? ok(await c.from(tabla).update(campos).eq('id', id).select('id'))
      : ok(await c.from(tabla).insert(campos).select('id'));
    if (!filas?.length) throw new Error('No tienes permiso para hacer este cambio.');
  },
  async eliminar(tabla, id) {
    const c = await sb();
    const filas = ok(await c.from(tabla).delete().eq('id', id).select('id'));
    if (!filas?.length) throw new Error('No tienes permiso para eliminar esto.');
  },
};

export const api = modoDemo ? demo : nube;
