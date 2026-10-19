// Bitácora GOYN BAQ · interfaz (fase 1)
// Rutas con # para funcionar en GitHub Pages sin configuración de servidor.

import { api, modoDemo, correoValido, CODIGO_DEMO } from './data.js';
import { CONFIG } from './config.js';
import { CATEGORIAS, ANIO_PLAN, COORDINACIONES } from './seed.js';

const $app = document.getElementById('app');
const $modal = document.getElementById('capa-modal');
const $avisos = document.getElementById('avisos');

const S = {
  sesion: null,
  d: null,
  paso: 'correo',
  correo: '',
  filtroPlan: 'todas',
  rutaPrevia: '',
};

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cop = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const hoyISO = () => { const t = new Date(); return new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const dias = (iso) => Math.round((Date.parse(`${iso}T00:00:00`) - Date.parse(`${hoyISO()}T00:00:00`)) / 864e5);
const fechaCorta = (iso) => {
  if (!iso) return '';
  const f = new Date(`${iso}T12:00:00`);
  const opciones = { day: 'numeric', month: 'short' };
  if (f.getFullYear() !== new Date().getFullYear()) opciones.year = 'numeric';
  return f.toLocaleDateString('es-CO', opciones).replace('.', '');
};
const urlValida = (u) => !u || /^https?:\/\/\S+$/i.test(u.trim());
const soloDigitos = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
const porOrden = (a, b) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.nombre).localeCompare(b.nombre, 'es');
const porFecha = (campo) => (a, b) => (a[campo] || '9999').localeCompare(b[campo] || '9999');

const ESTADOS = {
  por_iniciar: 'Por iniciar', en_curso: 'En curso', completada: 'Completada', en_riesgo: 'En riesgo', cancelada: 'Cancelada',
};
const ROLES = { admin: 'Administración', lider: 'Líder de coordinación', miembro: 'Miembro', lector: 'Solo lectura' };
const TRIMESTRES = ['T1', 'T2', 'T3', 'T4'];

function aviso(texto, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  el.textContent = texto;
  $avisos.append(el);
  setTimeout(() => el.classList.add('saliendo'), 3200);
  setTimeout(() => el.remove(), 3700);
}

// ---------------------------------------------------------------------
// Acceso a datos ya cargados
// ---------------------------------------------------------------------

const D = () => S.d;
const yo = () => D()?.perfiles.find((p) => p.id === S.sesion?.user.id);
const perfil = (id) => D().perfiles.find((p) => p.id === id);
const coord = (id) => D().coordinaciones.find((c) => c.id === id);
const prioridad = (id) => D().prioridades.find((p) => p.id === id);
const accion = (id) => D().acciones.find((a) => a.id === id);
const hito = (id) => D().hitos.find((h) => h.id === id);
const coords = () => [...D().coordinaciones].sort(porOrden);
const priosDe = (cid) => D().prioridades.filter((p) => p.coordinacion_id === cid && (p.anio ?? ANIO_PLAN) === ANIO_PLAN).sort(porOrden);
const accionesDe = (pid) => D().acciones.filter((a) => a.prioridad_id === pid).sort(porFecha('fecha_inicio'));
const hitosDe = (aid) => D().hitos.filter((h) => h.accion_id === aid).sort(porFecha('fecha_limite'));
const reportesDe = (aid) => D().reportes.filter((r) => r.accion_id === aid).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
const hitosDePrioridad = (pid) => accionesDe(pid).flatMap((a) => hitosDe(a.id));
const accionesDeCoord = (cid) => priosDe(cid).flatMap((p) => accionesDe(p.id));
const hitosDeCoord = (cid) => priosDe(cid).flatMap((p) => hitosDePrioridad(p.id));
const coordDeAccion = (a) => prioridad(a.prioridad_id)?.coordinacion_id;

const nombre = (id) => {
  const p = id && perfil(id);
  if (!p) return 'Sin asignar';
  return p.nombre || p.email.split('@')[0];
};
const avance = (hitos) => {
  const total = hitos.length;
  const hechos = hitos.filter((h) => h.cumplido).length;
  return { total, hechos, pct: total ? Math.round((hechos / total) * 100) : 0 };
};
const presupuesto = (acciones) => acciones.reduce(
  (t, a) => ({ plan: t.plan + (Number(a.presupuesto_planeado) || 0), ejec: t.ejec + (Number(a.presupuesto_ejecutado) || 0) }),
  { plan: 0, ejec: 0 },
);

// Permisos: reflejan las políticas de supabase/01_esquema.sql.
const rol = () => yo()?.rol || 'lector';
const esAdmin = () => rol() === 'admin';
const editaCoord = (cid) => esAdmin() || (['lider', 'miembro'].includes(rol()) && yo()?.coordinacion_id === cid);
const editaAccion = (a) => editaCoord(coordDeAccion(a)) || (rol() !== 'lector' && a.responsable_id === yo()?.id);
const borraAccion = (a) => esAdmin() || (rol() === 'lider' && yo()?.coordinacion_id === coordDeAccion(a));
const editaHito = (h) => {
  const a = accion(h.accion_id);
  return rol() !== 'lector' && (editaAccion(a) || h.responsable_id === yo()?.id);
};

// Compromisos de una persona: hitos a su nombre, y los hitos sin responsable de sus acciones.
const misHitos = () => {
  const id = yo()?.id;
  return D().hitos.filter((h) => h.responsable_id === id || (!h.responsable_id && accion(h.accion_id)?.responsable_id === id));
};

// ---------------------------------------------------------------------
// Piezas visuales
// ---------------------------------------------------------------------

const marca = (destino = '#/') => `
  <a class="marca" href="${destino}" aria-label="Bitácora GOYN BAQ, inicio">
    <span class="marca-simbolo" aria-hidden="true"><i class="m-rio"></i><i class="m-mango"></i></span>
    <span class="marca-texto">Bitácora <b>GOYN BAQ</b></span>
  </a>`;

function barra(hitos, { grande = false } = {}) {
  const { total, hechos, pct } = avance(hitos);
  if (!total) return `<div class="barra barra-vacia${grande ? ' barra-grande' : ''}"><span>Sin hitos todavía</span></div>`;
  const etiqueta = `${hechos} de ${total} hitos cumplidos`;
  const cuerpo = total <= 30
    ? [...hitos].sort((a, b) => Number(b.cumplido) - Number(a.cumplido)).map((h) => `<i class="seg${h.cumplido ? ' hecho' : ''}"></i>`).join('')
    : `<i class="relleno" style="width:${pct}%"></i>`;
  return `<div class="barra${grande ? ' barra-grande' : ''}" role="img" aria-label="${etiqueta}">
      <div class="barra-pista${total > 30 ? ' continua' : ''}">${cuerpo}</div>
      <span class="barra-dato">${pct}%</span>
    </div>`;
}

const chipCategoria = (cat) => `<span class="chip chip-${cat}">${esc(CATEGORIAS[cat]?.nombre || cat)}</span>`;
const chipEstado = (e) => `<span class="estado estado-${e}">${ESTADOS[e] || e}</span>`;
const cifra = (num, texto, extra = '') => `<div class="cifra ${extra}"><span class="cifra-num">${num}</span><span class="cifra-txt">${texto}</span></div>`;

function fechaHito(h) {
  if (!h.fecha_limite) return h.trimestre ? `<span class="fecha">${h.trimestre}</span>` : '';
  if (h.cumplido) return `<span class="fecha">${fechaCorta(h.fecha_limite)}</span>`;
  const n = dias(h.fecha_limite);
  const clase = n < 0 ? 'vencido' : n <= 7 ? 'pronto' : '';
  const nota = n < 0 ? `venció hace ${-n} ${-n === 1 ? 'día' : 'días'}` : n === 0 ? 'vence hoy' : n <= 7 ? `vence en ${n} ${n === 1 ? 'día' : 'días'}` : '';
  return `<span class="fecha ${clase}">${fechaCorta(h.fecha_limite)}${nota ? ` <em>${nota}</em>` : ''}</span>`;
}

function filaHito(h, { contexto = false } = {}) {
  const puede = editaHito(h);
  const a = accion(h.accion_id);
  const p = a && prioridad(a.prioridad_id);
  return `<li class="hito${h.cumplido ? ' cumplido' : ''}">
    <label class="hito-check">
      <input type="checkbox" data-act="marcar-hito" data-id="${h.id}" ${h.cumplido ? 'checked' : ''} ${puede ? '' : 'disabled'}
        aria-label="${h.cumplido ? 'Desmarcar' : 'Marcar como cumplido'}: ${esc(h.nombre)}">
      <span class="caja" aria-hidden="true"></span>
    </label>
    <div class="hito-cuerpo">
      <span class="hito-nombre">${esc(h.nombre)}</span>
      ${contexto && a ? `<a class="hito-contexto" href="#/app/prioridad/${p?.id}">${esc(a.nombre)} <span aria-hidden="true">›</span> ${esc(p?.nombre)}</a>` : ''}
      <span class="hito-meta">
        ${h.trimestre && h.fecha_limite ? `<span>${h.trimestre}</span>` : ''}
        ${fechaHito(h)}
        <span>${esc(nombre(h.responsable_id || a?.responsable_id))}</span>
        ${h.evidencia_url ? `<a href="${esc(h.evidencia_url)}" target="_blank" rel="noopener">Ver evidencia</a>`
          : puede ? `<button class="enlace" data-act="evidencia" data-id="${h.id}">Agregar evidencia</button>` : ''}
      </span>
    </div>
    ${puede ? `<div class="hito-herr">
      <button class="icono" data-act="editar-hito" data-id="${h.id}" aria-label="Editar hito ${esc(h.nombre)}" title="Editar">${ICONOS.lapiz}</button>
    </div>` : ''}
  </li>`;
}

const ICONOS = {
  lapiz: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.6 3.4a2 2 0 0 1 2.8 2.8l-9 9-3.9 1.1 1.1-3.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  mas: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

function bloqueAccion(a) {
  const hs = hitosDe(a.id);
  const rs = reportesDe(a.id);
  const puede = editaAccion(a);
  const fechas = a.fecha_inicio || a.fecha_fin
    ? `${a.fecha_inicio ? fechaCorta(a.fecha_inicio) : 'Sin inicio'} a ${a.fecha_fin ? fechaCorta(a.fecha_fin) : 'sin cierre'}` : 'Sin fechas';
  const plan = Number(a.presupuesto_planeado) || 0;
  const ejec = Number(a.presupuesto_ejecutado) || 0;
  return `<article class="accion" id="accion-${a.id}">
    <header class="accion-cab">
      <div>
        <h3>${esc(a.nombre)}</h3>
        <p class="accion-meta">
          ${chipEstado(a.estado)}
          <span>${esc(nombre(a.responsable_id))}</span>
          <span>${fechas}</span>
        </p>
      </div>
      ${barra(hs)}
    </header>
    ${a.descripcion ? `<p class="accion-desc">${esc(a.descripcion)}</p>` : ''}
    ${plan || ejec ? `<p class="accion-plata"><span>Presupuesto ${cop(plan)}</span><span>Ejecutado ${cop(ejec)}${plan ? ` (${Math.round((ejec / plan) * 100)}%)` : ''}</span>${a.fuente_financiacion ? `<span>${esc(a.fuente_financiacion)}</span>` : ''}</p>` : ''}
    <ul class="hitos">${hs.map((h) => filaHito(h)).join('') || '<li class="vacio-linea">Esta acción aún no tiene hitos. Los hitos verificables son los que miden el avance.</li>'}</ul>
    <footer class="accion-pie">
      ${puede ? `<button class="boton-sec" data-act="nuevo-hito" data-id="${a.id}">${ICONOS.mas} Agregar hito</button>` : ''}
      ${rol() !== 'lector' ? `<button class="boton-sec" data-act="reportar" data-id="${a.id}">Reportar avance</button>` : ''}
      ${puede ? `<button class="boton-sec" data-act="editar-accion" data-id="${a.id}">Editar acción</button>` : ''}
      ${borraAccion(a) ? `<button class="boton-sec peligro" data-act="borrar-accion" data-id="${a.id}">Eliminar</button>` : ''}
    </footer>
    ${rs.length ? `<details class="reportes"><summary>Reportes de avance (${rs.length})</summary>
      <ol>${rs.map((r) => `<li>
        <p>${esc(r.texto)}</p>
        <span class="reporte-meta">${esc(nombre(r.autor_id))}, ${new Date(r.creado).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
        ${r.evidencia_url ? ` <a href="${esc(r.evidencia_url)}" target="_blank" rel="noopener">Evidencia</a>` : ''}</span>
      </li>`).join('')}</ol></details>` : ''}
  </article>`;
}

// ---------------------------------------------------------------------
// Vistas públicas
// ---------------------------------------------------------------------

function vistaHome() {
  const enSesion = Boolean(S.sesion);
  const lado = (cat) => {
    const lista = (S.d ? coords() : null) || [];
    const fuente = lista.length ? lista.filter((c) => c.categoria === cat).map((c) => ({ nombre: c.nombre, n: priosDe(c.id).length }))
      : HOME_ESTRUCTURA.filter((c) => c.categoria === cat);
    return `<div class="orilla orilla-${cat}">
      <h3>${CATEGORIAS[cat].nombre}</h3>
      <p>${CATEGORIAS[cat].descripcion}</p>
      <ul>${fuente.map((c) => `<li><span>${esc(c.nombre)}</span><span class="puntos" aria-label="${c.n} prioridades">${'<i></i>'.repeat(c.n)}</span></li>`).join('')}</ul>
    </div>`;
  };
  return `
  <header class="home-top">
    ${marca()}
    <a class="boton" href="${enSesion ? '#/app' : '#/ingresar'}">${enSesion ? 'Ir a mi espacio' : 'Ingresar'}</a>
  </header>
  <main class="home" id="principal">
    <section class="hero">
      <h1>El plan de GOYN Barranquilla, a la vista de todo el equipo.</h1>
      <p class="hero-texto">La Bitácora reúne las prioridades ${ANIO_PLAN}, las acciones que las mueven y los hitos que prueban el avance. Cada coordinación gestiona lo suyo y todo el equipo ve el conjunto.</p>
      <div class="hero-accion">
        <a class="boton boton-grande" href="${enSesion ? '#/app' : '#/ingresar'}">${enSesion ? 'Ir a mi espacio' : 'Ingresar con mi correo GOYN'}</a>
        <p class="nota">Acceso exclusivo para correos @${CONFIG.DOMINIO}</p>
      </div>
    </section>

    <section class="estructura" aria-labelledby="t-estructura">
      <h2 id="t-estructura">Ocho coordinaciones, veinticuatro prioridades</h2>
      <p class="seccion-intro">Cada punto es una prioridad ${ANIO_PLAN}. Las coordinaciones de Pathways abren rutas hacia las oportunidades; las Habilitantes sostienen esas rutas.</p>
      <div class="orillas">${lado('pathways')}${lado('habilitantes')}</div>
    </section>

    <section class="como" aria-labelledby="t-como">
      <h2 id="t-como">Cómo funciona</h2>
      <ol class="pasos">
        <li><h3>Ingresa con tu correo institucional</h3><p>Te enviamos un código de seis dígitos. No hay contraseñas que recordar.</p></li>
        <li><h3>Completa tu perfil</h3><p>Tu nombre, tu cargo y la coordinación a la que perteneces.</p></li>
        <li><h3>Gestiona y reporta</h3><p>Carga acciones, define hitos verificables, márcalos cuando se cumplan y adjunta la evidencia.</p></li>
      </ol>
    </section>

    <section class="espacios" aria-labelledby="t-espacios">
      <h2 id="t-espacios">Qué encuentras dentro</h2>
      <dl class="lista-espacios">
        <div><dt>Mi espacio</dt><dd>Tus compromisos, lo que vence esta semana y el avance de tu coordinación.</dd></div>
        <div><dt>Plan GOYN BAQ</dt><dd>Todas las prioridades ${ANIO_PLAN} con su avance, acciones y presupuesto.</dd></div>
        <div><dt>Mi coordinación</dt><dd>El plan de trabajo de tu equipo: acciones, responsables, fechas y presupuesto.</dd></div>
        <div><dt>Mis compromisos</dt><dd>Todo lo que tienes a tu cargo, ordenado por fecha, para reportar avance.</dd></div>
      </dl>
      <p class="proximamente">Llegan después: tablero de resultados, repositorio de documentos, comunidad y calendario del equipo.</p>
    </section>
  </main>
  <footer class="home-pie">Bitácora GOYN BAQ, un desarrollo de Gestión de Conocimiento de GOYN Barranquilla.</footer>`;
}

// Estructura pública mínima para la Home (sin datos internos).
const HOME_ESTRUCTURA = COORDINACIONES.map((c) => ({ nombre: c.nombre, categoria: c.categoria, n: c.prioridades.length }));

function vistaIngresar() {
  const demo = modoDemo
    ? `<p class="nota-demo"><b>Modo demostración.</b> No se envía ningún correo: usa cualquier dirección @${CONFIG.DOMINIO} y el código <b>${CODIGO_DEMO}</b>.</p>` : '';
  const cuerpo = S.paso === 'correo' ? `
      <h1 id="t-ingreso">Ingresa a la Bitácora</h1>
      <p>Escribe tu correo institucional y te enviaremos un código para entrar.</p>
      <form data-form="correo" novalidate>
        <label for="correo">Correo institucional</label>
        <input id="correo" name="correo" type="email" autocomplete="email" inputmode="email" required
          placeholder="nombre@${CONFIG.DOMINIO}" value="${esc(S.correo)}">
        <p class="error" id="error-ingreso" role="alert"></p>
        <button class="boton boton-ancho" type="submit">Enviarme el código</button>
      </form>` : `
      <h1 id="t-ingreso">Revisa tu correo</h1>
      <p>Enviamos un código de seis dígitos a <b>${esc(S.correo)}</b>. ${modoDemo ? '' : 'También puedes abrir el enlace del correo desde este mismo navegador.'}</p>
      <form data-form="codigo" novalidate>
        <label for="codigo">Código</label>
        <input id="codigo" name="codigo" class="entrada-codigo" inputmode="numeric" autocomplete="one-time-code"
          pattern="[0-9]*" maxlength="6" required placeholder="000000">
        <p class="error" id="error-ingreso" role="alert"></p>
        <button class="boton boton-ancho" type="submit">Entrar</button>
      </form>
      <p class="ingreso-otros">
        <button class="enlace" data-act="otro-correo">Usar otro correo</button>
        <button class="enlace" data-act="reenviar">Reenviar el código</button>
      </p>`;
  return `<main class="ingreso" id="principal">
    <div class="ingreso-tarjeta" aria-labelledby="t-ingreso">
      ${marca()}
      ${cuerpo}
      ${demo}
    </div>
    <a class="volver" href="#/">Volver al inicio</a>
  </main>`;
}

function vistaPerfil() {
  const me = yo();
  const primeraVez = !me?.nombre || !me?.coordinacion_id;
  const opciones = Object.keys(CATEGORIAS).map((cat) => `<optgroup label="${CATEGORIAS[cat].nombre}">
      ${coords().filter((c) => c.categoria === cat).map((c) => `<option value="${c.id}" ${me?.coordinacion_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
    </optgroup>`).join('');
  return `<main class="ingreso" id="principal">
    <div class="ingreso-tarjeta">
      ${marca(primeraVez ? '#/' : '#/app')}
      <h1>${primeraVez ? 'Completa tu perfil' : 'Tu perfil'}</h1>
      <p>${primeraVez ? 'Así el equipo sabe quién responde por cada acción y cada hito.' : `Ingresaste como ${esc(me.email)}.`}</p>
      <form data-form="perfil" novalidate>
        <label for="p-nombre">Nombre y apellido</label>
        <input id="p-nombre" name="nombre" required autocomplete="name" value="${esc(me?.nombre)}">
        <label for="p-cargo">Cargo</label>
        <input id="p-cargo" name="cargo" autocomplete="organization-title" value="${esc(me?.cargo)}" placeholder="Por ejemplo: Profesional MEL">
        <label for="p-coord">Coordinación</label>
        <select id="p-coord" name="coordinacion_id" required>
          <option value="">Elige tu coordinación</option>${opciones}
        </select>
        <p class="campo-nota">Rol en la Bitácora: <b>${ROLES[me?.rol] || 'Miembro'}</b>. Solo administración puede cambiarlo.</p>
        <p class="error" role="alert"></p>
        <button class="boton boton-ancho" type="submit">Guardar perfil</button>
      </form>
      ${primeraVez ? '' : '<a class="volver" href="#/app">Volver a mi espacio</a>'}
    </div>
  </main>`;
}

// ---------------------------------------------------------------------
// Estructura interna
// ---------------------------------------------------------------------

function shell(activo, contenido) {
  const me = yo();
  const enlace = (ruta, texto, clave) => `<li><a href="#/app${ruta}" ${activo === clave ? 'aria-current="page"' : ''}>${texto}</a></li>`;
  return `<div class="shell">
    <aside class="lateral">
      ${marca('#/app')}
      <nav aria-label="Secciones">
        <ul>
          ${enlace('', 'Mi espacio', 'inicio')}
          ${enlace('/plan', 'Plan GOYN BAQ', 'plan')}
          ${enlace('/coordinacion', 'Mi coordinación', 'coordinacion')}
          ${enlace('/compromisos', 'Mis compromisos', 'compromisos')}
        </ul>
        <p class="nav-futuro">Llegan después</p>
        <ul class="nav-desactivada" aria-label="Secciones en construcción">
          <li><span>Tablero de resultados</span></li>
          <li><span>Repositorio</span></li>
          <li><span>Comunidad</span></li>
          <li><span>Calendario</span></li>
        </ul>
      </nav>
      <div class="usuario">
        <span class="usuario-nombre">${esc(me?.nombre || me?.email)}</span>
        <span class="usuario-rol">${esc(coord(me?.coordinacion_id)?.nombre || '')}${me?.rol && me.rol !== 'miembro' ? `, ${ROLES[me.rol]}` : ''}</span>
        <span class="usuario-acciones"><a href="#/perfil">Editar perfil</a><button class="enlace" data-act="salir">Salir</button></span>
      </div>
    </aside>
    <main class="principal" id="principal" tabindex="-1">
      ${modoDemo ? `<p class="banda-demo">Modo demostración: los datos viven solo en este navegador. <button class="enlace" data-act="reiniciar-demo">Reiniciar datos de ejemplo</button></p>` : ''}
      ${contenido}
    </main>
  </div>`;
}

function vistaInicio() {
  const me = yo();
  const cid = me.coordinacion_id;
  const c = coord(cid);
  const pendientes = misHitos().filter((h) => !h.cumplido).sort(porFecha('fecha_limite'));
  const vencidos = pendientes.filter((h) => h.fecha_limite && dias(h.fecha_limite) < 0);
  const semana = pendientes.filter((h) => h.fecha_limite && dias(h.fecha_limite) >= 0 && dias(h.fecha_limite) <= 7);
  const misAcciones = D().acciones.filter((a) => a.responsable_id === me.id && a.estado !== 'cancelada');
  const av = avance(hitosDeCoord(cid));
  const primerNombre = (me.nombre || '').split(' ')[0];

  return shell('inicio', `
    <header class="cabecera">
      <h1>Hola, ${esc(primerNombre)}</h1>
      <p>${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}. Esto es lo que tienes en curso.</p>
    </header>
    <div class="cifras">
      ${cifra(pendientes.length, pendientes.length === 1 ? 'hito pendiente a tu cargo' : 'hitos pendientes a tu cargo')}
      ${cifra(semana.length, 'vencen en los próximos 7 días', semana.length ? 'cifra-pronto' : '')}
      ${cifra(vencidos.length, vencidos.length === 1 ? 'hito vencido' : 'hitos vencidos', vencidos.length ? 'cifra-vencido' : '')}
      ${cifra(`${av.pct}%`, `avance de ${esc(c?.nombre || 'tu coordinación')}`)}
    </div>

    <section class="panel">
      <div class="panel-cab"><h2>Próximos hitos</h2><a href="#/app/compromisos">Ver todos mis compromisos</a></div>
      ${pendientes.length ? `<ul class="hitos">${pendientes.slice(0, 6).map((h) => filaHito(h, { contexto: true })).join('')}</ul>`
        : `<p class="vacio">No tienes hitos pendientes. Cuando te asignen uno, aparecerá aquí. Puedes revisar el plan de <a href="#/app/coordinacion">tu coordinación</a>.</p>`}
    </section>

    <div class="dos-col">
      <section class="panel">
        <div class="panel-cab"><h2>Acciones a tu cargo</h2></div>
        ${misAcciones.length ? `<ul class="lista-simple">${misAcciones.map((a) => `<li>
            <a href="#/app/prioridad/${a.prioridad_id}">${esc(a.nombre)}</a>
            <span class="lista-meta">${chipEstado(a.estado)} ${esc(prioridad(a.prioridad_id)?.nombre)}</span>
            ${barra(hitosDe(a.id))}
          </li>`).join('')}</ul>`
          : '<p class="vacio">No eres responsable de ninguna acción por ahora.</p>'}
      </section>
      <section class="panel">
        <div class="panel-cab"><h2>${esc(c?.nombre || 'Tu coordinación')}</h2><a href="#/app/coordinacion">Abrir plan</a></div>
        <ul class="lista-simple">${priosDe(cid).map((p) => `<li>
            <a href="#/app/prioridad/${p.id}">${esc(p.nombre)}</a>
            <span class="lista-meta">${accionesDe(p.id).length} ${accionesDe(p.id).length === 1 ? 'acción' : 'acciones'}</span>
            ${barra(hitosDePrioridad(p.id))}
          </li>`).join('') || '<li class="vacio">Esta coordinación aún no tiene prioridades cargadas.</li>'}</ul>
      </section>
    </div>`);
}

function vistaPlan() {
  const todasA = D().acciones;
  const todosH = D().hitos;
  const av = avance(todosH);
  const pr = presupuesto(todasA);
  const f = S.filtroPlan;
  const cats = Object.keys(CATEGORIAS).filter((k) => f === 'todas' || f === k);
  const filtro = (valor, texto) => `<button role="radio" aria-checked="${f === valor}" data-act="filtro-plan" data-valor="${valor}">${texto}</button>`;

  return shell('plan', `
    <header class="cabecera">
      <h1>Plan GOYN BAQ ${ANIO_PLAN}</h1>
      <p>Las prioridades de las ocho coordinaciones, con el avance que reportan sus hitos.</p>
    </header>
    <div class="cifras">
      ${cifra(D().prioridades.length, 'prioridades')}
      ${cifra(todasA.length, todasA.length === 1 ? 'acción registrada' : 'acciones registradas')}
      ${cifra(`${av.hechos}/${av.total}`, 'hitos cumplidos')}
      ${cifra(cop(pr.plan), `presupuesto planeado, ${cop(pr.ejec)} ejecutado`, 'cifra-plata')}
    </div>
    <div class="filtro" role="radiogroup" aria-label="Filtrar por categoría">
      ${filtro('todas', 'Todas')}${filtro('pathways', 'Pathways')}${filtro('habilitantes', 'Habilitantes')}
    </div>
    ${cats.map((cat) => `
      <section class="categoria categoria-${cat}" aria-labelledby="t-${cat}">
        <h2 id="t-${cat}">${CATEGORIAS[cat].nombre}<span>${CATEGORIAS[cat].descripcion}</span></h2>
        ${coords().filter((c) => c.categoria === cat).map((c) => {
          const ps = priosDe(c.id);
          return `<div class="coord-bloque">
            <div class="coord-cab">
              <h3><a href="#/app/coordinacion/${c.id}">${esc(c.nombre)}</a></h3>
              ${barra(hitosDeCoord(c.id))}
            </div>
            <ul class="prios">${ps.map((p) => {
              const as = accionesDe(p.id);
              const hs = hitosDePrioridad(p.id);
              const pp = presupuesto(as);
              return `<li>
                <a class="prio" href="#/app/prioridad/${p.id}">
                  <span class="prio-nombre">${esc(p.nombre)}</span>
                  <span class="prio-resultado">${esc(p.resultado_esperado)}</span>
                  <span class="prio-meta">${as.length} ${as.length === 1 ? 'acción' : 'acciones'}${pp.plan ? `, ${cop(pp.plan)}` : ''}</span>
                  ${barra(hs)}
                </a>
              </li>`;
            }).join('')}</ul>
          </div>`;
        }).join('')}
      </section>`).join('')}`);
}

function vistaPrioridad(id) {
  const p = prioridad(id);
  if (!p) return vistaNoEncontrada();
  const c = coord(p.coordinacion_id);
  const as = accionesDe(p.id);
  const pr = presupuesto(as);
  const puede = editaCoord(c.id);
  return shell('plan', `<div class="categoria-${c.categoria}">
    <nav class="migas" aria-label="Ruta"><a href="#/app/plan">Plan GOYN BAQ</a> <span aria-hidden="true">›</span> <a href="#/app/coordinacion/${c.id}">${esc(c.nombre)}</a></nav>
    <header class="cabecera cabecera-prio">
      ${chipCategoria(c.categoria)}
      <h1>${esc(p.nombre)}</h1>
      <dl class="prio-def">
        <div><dt>Resultado esperado</dt><dd>${esc(p.resultado_esperado) || 'Por definir'}</dd></div>
        <div><dt>Producto clave</dt><dd>${esc(p.producto_clave) || 'Por definir'}</dd></div>
      </dl>
    </header>
    <div class="resumen-prio">
      ${barra(hitosDePrioridad(p.id), { grande: true })}
      <p>${as.length} ${as.length === 1 ? 'acción' : 'acciones'}. Presupuesto ${cop(pr.plan)}, ejecutado ${cop(pr.ejec)}.</p>
    </div>
    <section class="seccion-acciones" aria-labelledby="t-acciones">
      <div class="panel-cab">
        <h2 id="t-acciones">Acciones</h2>
        ${puede ? `<button class="boton" data-act="nueva-accion" data-id="${p.id}">${ICONOS.mas} Nueva acción</button>` : ''}
      </div>
      ${as.map(bloqueAccion).join('') || `<p class="vacio">Esta prioridad todavía no tiene acciones. ${puede ? 'Empieza por la primera acción y sus hitos trimestrales.' : `La coordinación de ${esc(c.nombre)} las cargará.`}</p>`}
    </section></div>`);
}

function vistaCoordinacion(id) {
  const me = yo();
  const cid = id || me.coordinacion_id;
  const c = coord(cid);
  if (!c) return vistaNoEncontrada();
  const ps = priosDe(cid);
  const as = accionesDeCoord(cid);
  const pr = presupuesto(as);
  const puede = editaCoord(cid);
  const esMia = cid === me.coordinacion_id;
  return shell(esMia ? 'coordinacion' : 'plan', `<div class="categoria-${c.categoria}">
    <header class="cabecera">
      ${chipCategoria(c.categoria)}
      <h1>${esc(c.nombre)}</h1>
      <p>${esMia ? 'El plan de trabajo de tu equipo.' : 'Plan de trabajo de esta coordinación.'} ${puede ? 'Puedes crear y actualizar acciones e hitos.' : 'Vista de consulta.'}</p>
      <label class="cambiar-coord">
        <span>Ver otra coordinación</span>
        <select data-act="cambiar-coord">
          ${coords().map((x) => `<option value="${x.id}" ${x.id === cid ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}
        </select>
      </label>
    </header>
    <div class="cifras">
      ${cifra(ps.length, 'prioridades')}
      ${cifra(as.length, as.length === 1 ? 'acción' : 'acciones')}
      ${cifra(`${avance(hitosDeCoord(cid)).pct}%`, 'de los hitos cumplidos')}
      ${cifra(cop(pr.plan), `planeado, ${cop(pr.ejec)} ejecutado`, 'cifra-plata')}
    </div>
    ${ps.map((p) => `
      <section class="prio-seccion" aria-labelledby="t-p-${p.id}">
        <div class="prio-seccion-cab">
          <div>
            <h2 id="t-p-${p.id}"><a href="#/app/prioridad/${p.id}">${esc(p.nombre)}</a></h2>
            <p>${esc(p.resultado_esperado)}</p>
          </div>
          ${barra(hitosDePrioridad(p.id))}
        </div>
        ${accionesDe(p.id).map(bloqueAccion).join('') || '<p class="vacio">Aún no hay acciones para esta prioridad.</p>'}
        ${puede ? `<button class="boton-sec" data-act="nueva-accion" data-id="${p.id}">${ICONOS.mas} Nueva acción en ${esc(p.nombre)}</button>` : ''}
      </section>`).join('')}</div>`);
}

function vistaCompromisos() {
  const hs = misHitos();
  const pend = hs.filter((h) => !h.cumplido).sort(porFecha('fecha_limite'));
  const grupos = [
    ['Vencidos', pend.filter((h) => h.fecha_limite && dias(h.fecha_limite) < 0)],
    ['Esta semana', pend.filter((h) => h.fecha_limite && dias(h.fecha_limite) >= 0 && dias(h.fecha_limite) <= 7)],
    ['Más adelante', pend.filter((h) => h.fecha_limite && dias(h.fecha_limite) > 7)],
    ['Sin fecha', pend.filter((h) => !h.fecha_limite)],
  ].filter(([, l]) => l.length);
  const hechos = hs.filter((h) => h.cumplido).sort((a, b) => (b.fecha_cumplido || '').localeCompare(a.fecha_cumplido || ''));
  const misAcciones = D().acciones.filter((a) => a.responsable_id === yo().id);

  return shell('compromisos', `
    <header class="cabecera">
      <h1>Mis compromisos</h1>
      <p>Los hitos a tu cargo, de tu coordinación o de otras. Márcalos cuando se cumplan y adjunta la evidencia.</p>
    </header>
    ${grupos.map(([titulo, lista]) => `<section class="panel">
        <div class="panel-cab"><h2>${titulo} <span class="conteo">${lista.length}</span></h2></div>
        <ul class="hitos">${lista.map((h) => filaHito(h, { contexto: true })).join('')}</ul>
      </section>`).join('') || '<section class="panel"><p class="vacio">No tienes hitos pendientes. Cuando una coordinación te asigne uno, aparecerá aquí.</p></section>'}
    ${misAcciones.length ? `<section class="panel">
        <div class="panel-cab"><h2>Acciones a tu cargo <span class="conteo">${misAcciones.length}</span></h2></div>
        ${misAcciones.map(bloqueAccion).join('')}
      </section>` : ''}
    ${hechos.length ? `<details class="panel cumplidos"><summary>Cumplidos (${hechos.length})</summary>
        <ul class="hitos">${hechos.map((h) => filaHito(h, { contexto: true })).join('')}</ul></details>` : ''}`);
}

const vistaNoEncontrada = () => shell('', `<header class="cabecera"><h1>No encontramos esta página</h1>
  <p>Puede que el elemento se haya eliminado. <a href="#/app">Volver a mi espacio</a>.</p></header>`);

// ---------------------------------------------------------------------
// Formularios en ventana
// ---------------------------------------------------------------------

let focoPrevio = null;
function abrirModal(titulo, cuerpo) {
  focoPrevio = document.activeElement;
  $modal.innerHTML = `<div class="modal-fondo" data-act="cerrar-modal"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <h2 id="modal-titulo">${titulo}</h2>
      ${cuerpo}
    </div>`;
  $modal.hidden = false;
  document.body.classList.add('con-modal');
  $modal.querySelector('input:not([type=hidden]), textarea, select, button')?.focus();
}
function cerrarModal() {
  $modal.hidden = true;
  $modal.innerHTML = '';
  document.body.classList.remove('con-modal');
  focoPrevio?.focus?.();
}

const opcionesPersonas = (sel) => `<option value="">Sin asignar</option>${[...D().perfiles]
  .sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email, 'es'))
  .map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nombre || p.email)}${p.coordinacion_id ? `, ${esc(coord(p.coordinacion_id)?.nombre)}` : ''}</option>`).join('')}`;

const pieForm = (texto) => `<p class="error" role="alert"></p>
  <div class="modal-pie"><button type="button" class="boton-sec" data-act="cerrar-modal">Cancelar</button><button class="boton" type="submit">${texto}</button></div>`;

function formAccion(a, prioridadId) {
  const p = prioridad(a?.prioridad_id || prioridadId);
  const v = a || { estado: 'por_iniciar', responsable_id: yo().id };
  abrirModal(a ? 'Editar acción' : 'Nueva acción', `
    <p class="modal-contexto">${esc(p.nombre)}</p>
    <form data-form="accion" novalidate>
      <input type="hidden" name="id" value="${a?.id || ''}"><input type="hidden" name="prioridad_id" value="${p.id}">
      <label for="f-nombre">Nombre de la acción</label>
      <input id="f-nombre" name="nombre" required maxlength="200" value="${esc(v.nombre)}">
      <label for="f-desc">Descripción <span class="opcional">opcional</span></label>
      <textarea id="f-desc" name="descripcion" rows="3">${esc(v.descripcion)}</textarea>
      <div class="campos-2">
        <div><label for="f-resp">Responsable</label><select id="f-resp" name="responsable_id">${opcionesPersonas(v.responsable_id)}</select></div>
        <div><label for="f-estado">Estado</label><select id="f-estado" name="estado">${Object.entries(ESTADOS).map(([k, t]) => `<option value="${k}" ${v.estado === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div><label for="f-ini">Inicio</label><input id="f-ini" type="date" name="fecha_inicio" value="${v.fecha_inicio || ''}"></div>
        <div><label for="f-fin">Cierre</label><input id="f-fin" type="date" name="fecha_fin" value="${v.fecha_fin || ''}"></div>
        <div><label for="f-plan">Presupuesto planeado (COP)</label><input id="f-plan" name="presupuesto_planeado" inputmode="numeric" value="${Number(v.presupuesto_planeado) || ''}" placeholder="0"></div>
        <div><label for="f-ejec">Presupuesto ejecutado (COP)</label><input id="f-ejec" name="presupuesto_ejecutado" inputmode="numeric" value="${Number(v.presupuesto_ejecutado) || ''}" placeholder="0"></div>
      </div>
      <label for="f-fuente">Fuente de financiación <span class="opcional">opcional</span></label>
      <input id="f-fuente" name="fuente_financiacion" value="${esc(v.fuente_financiacion)}" placeholder="Por ejemplo: Botnar, Accenture, recursos propios">
      ${pieForm(a ? 'Guardar cambios' : 'Crear acción')}
    </form>`);
}

function formHito(h, accionId) {
  const a = accion(h?.accion_id || accionId);
  const v = h || { responsable_id: a.responsable_id };
  abrirModal(h ? 'Editar hito' : 'Nuevo hito', `
    <p class="modal-contexto">${esc(a.nombre)}</p>
    <form data-form="hito" novalidate>
      <input type="hidden" name="id" value="${h?.id || ''}"><input type="hidden" name="accion_id" value="${a.id}">
      <label for="h-nombre">Hito verificable</label>
      <input id="h-nombre" name="nombre" required maxlength="200" value="${esc(v.nombre)}" placeholder="Algo que se pueda responder con sí o no">
      <div class="campos-2">
        <div><label for="h-tri">Trimestre</label><select id="h-tri" name="trimestre"><option value="">Sin trimestre</option>${TRIMESTRES.map((t) => `<option ${v.trimestre === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div><label for="h-fecha">Fecha límite</label><input id="h-fecha" type="date" name="fecha_limite" value="${v.fecha_limite || ''}"></div>
      </div>
      <label for="h-resp">Responsable</label>
      <select id="h-resp" name="responsable_id">${opcionesPersonas(v.responsable_id)}</select>
      <label for="h-evid">Enlace a la evidencia <span class="opcional">opcional</span></label>
      <input id="h-evid" name="evidencia_url" type="url" value="${esc(v.evidencia_url)}" placeholder="https://fcorona.sharepoint.com/...">
      <label class="check-linea"><input type="checkbox" name="cumplido" ${v.cumplido ? 'checked' : ''}> Cumplido</label>
      ${pieForm(h ? 'Guardar cambios' : 'Crear hito')}
    </form>
    ${h ? `<button class="enlace peligro" data-act="borrar-hito" data-id="${h.id}">Eliminar este hito</button>` : ''}`);
}

function formReporte(accionId) {
  const a = accion(accionId);
  abrirModal('Reportar avance', `
    <p class="modal-contexto">${esc(a.nombre)}</p>
    <form data-form="reporte" novalidate>
      <input type="hidden" name="accion_id" value="${a.id}">
      <label for="r-texto">Qué avanzó</label>
      <textarea id="r-texto" name="texto" rows="4" required placeholder="Lo que se hizo, lo que se logró y lo que sigue"></textarea>
      <label for="r-evid">Enlace a la evidencia <span class="opcional">opcional</span></label>
      <input id="r-evid" name="evidencia_url" type="url" placeholder="https://fcorona.sharepoint.com/...">
      ${pieForm('Publicar reporte')}
    </form>`);
}

function formEvidencia(hitoId) {
  const h = hito(hitoId);
  abrirModal('Agregar evidencia', `
    <p class="modal-contexto">${esc(h.nombre)}</p>
    <form data-form="evidencia" novalidate>
      <input type="hidden" name="id" value="${h.id}">
      <label for="e-url">Enlace al documento, carpeta o publicación</label>
      <input id="e-url" name="evidencia_url" type="url" required placeholder="https://fcorona.sharepoint.com/...">
      <label class="check-linea"><input type="checkbox" name="cumplido" checked> Marcar el hito como cumplido</label>
      ${pieForm('Guardar evidencia')}
    </form>`);
}

function confirmar(titulo, texto, boton, alAceptar) {
  abrirModal(titulo, `<p>${texto}</p>
    <div class="modal-pie"><button class="boton-sec" data-act="cerrar-modal">Cancelar</button>
    <button class="boton boton-peligro" data-act="confirmar">${boton}</button></div>`);
  pendienteConfirmar = alAceptar;
}
let pendienteConfirmar = null;

// ---------------------------------------------------------------------
// Guardado
// ---------------------------------------------------------------------

async function recargar() {
  S.d = await api.cargarTodo();
}

async function guardarCon(form, fn, mensaje) {
  const boton = form.querySelector('button[type=submit]');
  const error = form.querySelector('.error');
  error.textContent = '';
  const texto = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Guardando…';
  try {
    await fn();
    await recargar();
    cerrarModal();
    render({ conservarScroll: true });
    if (mensaje) aviso(mensaje);
  } catch (e) {
    error.textContent = e.message || 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.';
    boton.disabled = false;
    boton.textContent = texto;
  }
}

const falla = (form, msg) => { form.querySelector('.error').textContent = msg; };

const FORMULARIOS = {
  async correo(form) {
    const correo = form.correo.value.trim();
    const error = form.querySelector('.error');
    if (!correoValido(correo)) {
      error.textContent = `Usa tu correo institucional, terminado en @${CONFIG.DOMINIO}.`;
      form.correo.focus();
      return;
    }
    const b = form.querySelector('button');
    b.disabled = true; b.textContent = 'Enviando…';
    try {
      await api.enviarCodigo(correo);
      S.correo = correo; S.paso = 'codigo';
      render();
    } catch (e) {
      error.textContent = e.message;
      b.disabled = false; b.textContent = 'Enviarme el código';
    }
  },
  async codigo(form) {
    const codigo = form.codigo.value.replace(/\D/g, '');
    const error = form.querySelector('.error');
    if (codigo.length !== 6) { error.textContent = 'El código tiene seis dígitos.'; return; }
    const b = form.querySelector('button');
    b.disabled = true; b.textContent = 'Verificando…';
    try {
      S.sesion = await api.verificarCodigo(S.correo, codigo);
      S.paso = 'correo';
      await recargar();
      ir('/app');
    } catch (e) {
      error.textContent = e.message;
      b.disabled = false; b.textContent = 'Entrar';
    }
  },
  perfil(form) {
    const nombreV = form.nombre.value.trim();
    if (!nombreV) return falla(form, 'Escribe tu nombre.');
    if (!form.coordinacion_id.value) return falla(form, 'Elige tu coordinación.');
    guardarCon(form, async () => {
      await api.guardarPerfil(yo().id, { nombre: nombreV, cargo: form.cargo.value.trim(), coordinacion_id: form.coordinacion_id.value });
      await recargar();
      location.hash = '/app';
    }, 'Perfil guardado');
  },
  accion(form) {
    const f = Object.fromEntries(new FormData(form));
    if (!f.nombre.trim()) return falla(form, 'La acción necesita un nombre.');
    if (f.fecha_inicio && f.fecha_fin && f.fecha_fin < f.fecha_inicio) return falla(form, 'La fecha de cierre no puede ser anterior al inicio.');
    const plan = soloDigitos(f.presupuesto_planeado);
    const ejec = soloDigitos(f.presupuesto_ejecutado);
    guardarCon(form, () => api.guardar('acciones', {
      ...(f.id ? { id: f.id } : {}),
      prioridad_id: f.prioridad_id,
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim() || null,
      responsable_id: f.responsable_id || null,
      estado: f.estado,
      fecha_inicio: f.fecha_inicio || null,
      fecha_fin: f.fecha_fin || null,
      presupuesto_planeado: plan,
      presupuesto_ejecutado: ejec,
      fuente_financiacion: f.fuente_financiacion.trim() || null,
    }), f.id ? 'Acción guardada' : 'Acción creada');
  },
  hito(form) {
    const f = Object.fromEntries(new FormData(form));
    if (!f.nombre.trim()) return falla(form, 'El hito necesita un nombre.');
    if (!urlValida(f.evidencia_url)) return falla(form, 'El enlace debe empezar por https://');
    const cumplido = form.cumplido.checked;
    const previo = f.id ? hito(f.id) : null;
    guardarCon(form, () => api.guardar('hitos', {
      ...(f.id ? { id: f.id } : {}),
      accion_id: f.accion_id,
      nombre: f.nombre.trim(),
      trimestre: f.trimestre || null,
      fecha_limite: f.fecha_limite || null,
      responsable_id: f.responsable_id || null,
      evidencia_url: f.evidencia_url.trim() || null,
      cumplido,
      fecha_cumplido: cumplido ? (previo?.fecha_cumplido || hoyISO()) : null,
    }), f.id ? 'Hito guardado' : 'Hito creado');
  },
  reporte(form) {
    const f = Object.fromEntries(new FormData(form));
    if (!f.texto.trim()) return falla(form, 'Cuenta qué avanzó.');
    if (!urlValida(f.evidencia_url)) return falla(form, 'El enlace debe empezar por https://');
    guardarCon(form, () => api.guardar('reportes', {
      accion_id: f.accion_id, texto: f.texto.trim(), evidencia_url: f.evidencia_url.trim() || null, autor_id: yo().id,
    }), 'Reporte publicado');
  },
  evidencia(form) {
    const url = form.evidencia_url.value.trim();
    if (!url || !urlValida(url)) return falla(form, 'Pega un enlace que empiece por https://');
    const h = hito(form.id.value);
    const cumplido = form.cumplido.checked;
    guardarCon(form, () => api.guardar('hitos', {
      id: h.id, evidencia_url: url, cumplido, fecha_cumplido: cumplido ? (h.fecha_cumplido || hoyISO()) : null,
    }), 'Evidencia guardada');
  },
};

const ACCIONES = {
  'cerrar-modal': () => cerrarModal(),
  async confirmar(b) {
    const fn = pendienteConfirmar;
    pendienteConfirmar = null;
    b.disabled = true;
    try { await fn(); await recargar(); cerrarModal(); render({ conservarScroll: true }); } catch (e) { cerrarModal(); aviso(e.message, 'error'); }
  },
  'nueva-accion': (b) => formAccion(null, b.dataset.id),
  'editar-accion': (b) => formAccion(accion(b.dataset.id)),
  'borrar-accion': (b) => {
    const a = accion(b.dataset.id);
    confirmar('Eliminar acción', `Se eliminará <b>${esc(a.nombre)}</b> con sus ${hitosDe(a.id).length} hitos y sus reportes. Esta acción no se puede deshacer.`, 'Eliminar acción', async () => {
      await api.eliminar('acciones', a.id);
      aviso('Acción eliminada');
    });
  },
  'nuevo-hito': (b) => formHito(null, b.dataset.id),
  'editar-hito': (b) => formHito(hito(b.dataset.id)),
  'borrar-hito': (b) => {
    const h = hito(b.dataset.id);
    confirmar('Eliminar hito', `Se eliminará el hito <b>${esc(h.nombre)}</b>.`, 'Eliminar hito', async () => {
      await api.eliminar('hitos', h.id);
      aviso('Hito eliminado');
    });
  },
  reportar: (b) => formReporte(b.dataset.id),
  evidencia: (b) => formEvidencia(b.dataset.id),
  'filtro-plan': (b) => { S.filtroPlan = b.dataset.valor; render({ conservarScroll: true }); },
  'otro-correo': () => { S.paso = 'correo'; render(); },
  async reenviar(b) {
    b.disabled = true;
    try { await api.enviarCodigo(S.correo); aviso('Enviamos un nuevo código'); } catch (e) { aviso(e.message, 'error'); }
    setTimeout(() => { b.disabled = false; }, 30000);
  },
  async salir() {
    await api.salir();
    S.sesion = null; S.d = null;
    ir('/');
  },
  'reiniciar-demo': () => confirmar('Reiniciar la demostración', 'Se borran los datos de ejemplo guardados en este navegador y se vuelve a empezar.', 'Reiniciar', async () => {
    api.reiniciarDemo();
    S.sesion = null; S.d = null;
    ir('/ingresar');
  }),
};

async function marcarHito(input) {
  const h = hito(input.dataset.id);
  const cumplido = input.checked;
  input.disabled = true;
  try {
    await api.guardar('hitos', { id: h.id, cumplido, fecha_cumplido: cumplido ? hoyISO() : null });
    await recargar();
    render({ conservarScroll: true });
    aviso(cumplido ? 'Hito cumplido' : 'Hito marcado como pendiente');
  } catch (e) {
    input.checked = !cumplido;
    input.disabled = false;
    aviso(e.message, 'error');
  }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
  const fn = ACCIONES[b.dataset.act];
  if (fn) { e.preventDefault(); fn(b, e); }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.act === 'marcar-hito') marcarHito(el);
  if (el.dataset.act === 'cambiar-coord') ir(`/app/coordinacion/${el.value}`);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  FORMULARIOS[f.dataset.form]?.(f);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$modal.hidden) cerrarModal();
  if (e.key === 'Tab' && !$modal.hidden) {
    const focables = [...$modal.querySelectorAll('.modal button, .modal input, .modal select, .modal textarea, .modal a[href]')].filter((x) => !x.disabled);
    const [primero, ultimo] = [focables[0], focables.at(-1)];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }
});

// ---------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------

const partes = () => (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
function ir(ruta) {
  if (location.hash === `#${ruta}`) render();
  else location.hash = ruta;
}

async function render({ conservarScroll = false } = {}) {
  const r = partes();
  const privada = r[0] === 'app' || r[0] === 'perfil';
  try {
    if (privada && !S.sesion) return ir('/ingresar');
    if (r[0] === 'ingresar' && S.sesion) return ir('/app');
    if (privada && !S.d) await recargar();
    if (privada && !yo()) {
      // Sesión sin perfil visible: suele ser un correo fuera del dominio.
      await api.salir(); S.sesion = null; S.d = null;
      aviso(`Esta cuenta no tiene acceso. Ingresa con tu correo @${CONFIG.DOMINIO}.`, 'error');
      return ir('/ingresar');
    }
    if (privada && r[0] === 'app' && (!yo().nombre || !yo().coordinacion_id)) return ir('/perfil');

    let html;
    let titulo = 'Bitácora GOYN BAQ';
    if (!r.length) html = vistaHome();
    else if (r[0] === 'ingresar') { html = vistaIngresar(); titulo = 'Ingresar · Bitácora GOYN BAQ'; }
    else if (r[0] === 'perfil') { html = vistaPerfil(); titulo = 'Perfil · Bitácora GOYN BAQ'; }
    else if (r[0] === 'app') {
      const [, seccion, id] = r;
      if (!seccion) { html = vistaInicio(); titulo = 'Mi espacio · Bitácora GOYN BAQ'; }
      else if (seccion === 'plan') { html = vistaPlan(); titulo = 'Plan GOYN BAQ · Bitácora'; }
      else if (seccion === 'prioridad') { html = vistaPrioridad(id); titulo = `${prioridad(id)?.nombre || 'Prioridad'} · Bitácora`; }
      else if (seccion === 'coordinacion') { html = vistaCoordinacion(id); titulo = `${coord(id || yo().coordinacion_id)?.nombre || 'Coordinación'} · Bitácora`; }
      else if (seccion === 'compromisos') { html = vistaCompromisos(); titulo = 'Mis compromisos · Bitácora'; }
      else html = vistaNoEncontrada();
    } else html = vistaHome();

    const rutaActual = location.hash;
    const cambio = rutaActual !== S.rutaPrevia;
    const y = window.scrollY;
    $app.innerHTML = html;
    document.title = titulo;
    if (cambio && !conservarScroll) {
      window.scrollTo(0, 0);
      if (S.rutaPrevia) document.getElementById('principal')?.focus({ preventScroll: true });
    } else window.scrollTo(0, y);
    S.rutaPrevia = rutaActual;
    if (r[0] === 'ingresar') document.querySelector('#correo, #codigo')?.focus();
  } catch (e) {
    console.error(e);
    $app.innerHTML = `<main class="ingreso"><div class="ingreso-tarjeta">${marca()}<h1>No pudimos cargar la Bitácora</h1>
      <p>${esc(e.message)}</p><button class="boton" onclick="location.reload()">Intentar de nuevo</button></div></main>`;
  }
}

window.addEventListener('hashchange', () => render());

(async () => {
  try { S.sesion = await api.sesion(); } catch (e) { console.error(e); S.sesion = null; }
  render();
})();
