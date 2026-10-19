-- =====================================================================
-- Bitácora GOYN BAQ · Semilla de la planeación 2027
-- Generado desde js/seed.js con herramientas/generar-semilla.mjs. No editar a mano.
-- Ejecutar después de 01_esquema.sql. Se puede repetir sin duplicar.
-- =====================================================================

insert into public.coordinaciones (nombre, categoria, orden) values
  ('Empleo joven', 'pathways', 1),
  ('Emprendimiento juvenil', 'pathways', 2),
  ('Puentes a las oportunidades', 'pathways', 3),
  ('Cambio de narrativa', 'pathways', 4),
  ('Comunicaciones', 'habilitantes', 5),
  ('Gestión de conocimiento', 'habilitantes', 6),
  ('Impacto colectivo', 'habilitantes', 7),
  ('Involucramiento juvenil', 'habilitantes', 8)
on conflict (nombre) do update set categoria = excluded.categoria, orden = excluded.orden;

insert into public.prioridades (coordinacion_id, nombre, resultado_esperado, producto_clave, orden, anio)
select c.id, v.nombre, v.resultado, v.producto, v.orden, 2027
from (values
  ('Empleo joven', 'Bilingüismo de ciudad', 'Más jóvenes acceden a empleo formal con el inglés como competencia bisagra', 'Estrategia formulada y articulada, con hoja de ruta sobre su lugar en GOYN', 1),
  ('Empleo joven', 'Conexión oportuna con vacantes', 'Se reduce el tiempo entre vacante disponible y contratación', 'Mecanismo operando, escalando el piloto de Zona Franca La Cayena', 2),
  ('Empleo joven', 'Prácticas de selección empresarial', 'Más jóvenes superan el filtro inicial del que hoy quedan excluidos', 'Empresas sensibilizadas y empresas que modifican una práctica formal', 3),
  ('Emprendimiento juvenil', 'Sistema unificado de registro', 'La oferta se diseña con información real y no con supuestos', 'Instrumento de caracterización con línea base de emprendimientos', 1),
  ('Emprendimiento juvenil', 'Integración a GOYN Conecta', 'Acceso en un solo lugar a la oferta y a rutas de derivación claras', 'Plataforma con actores, programas y rutas de articulación operando', 2),
  ('Emprendimiento juvenil', 'Uso del sistema de visibilidad', 'Emprendimientos que mejoran en ventas, productividad y conexiones', 'Emprendimientos registrados con acceso a al menos una oportunidad', 3),
  ('Puentes a las oportunidades', 'Fortalecimiento de la red comunitaria', 'Red con gobernanza definida, articulada con al menos 5 actores clave', 'Gobernanza en operación, plan de capacidades e incentivos para la red', 1),
  ('Puentes a las oportunidades', 'Seguimiento de trayectorias', '100 jóvenes identificados, referenciados y con seguimiento inicial', 'Mecanismo diseñado, validado y pilotado con parte de la red', 2),
  ('Cambio de narrativa', 'Transformación cultural en empresas', 'Evidencia de qué funciona para cambiar comportamientos de jóvenes y empresas', 'Modelo construido desde el primer piloto, con ruta de escalamiento', 1),
  ('Cambio de narrativa', 'Podcast y Laboratorio de Narrativas', 'Apuesta unificada de cambio narrativo liderada por jóvenes', 'Laboratorio que forma a jóvenes en creación y producción de contenidos', 2),
  ('Cambio de narrativa', 'Continuidad con ACOPI y ANDI', 'Mayor apertura de empresas hacia nuevas formas de relacionarse con jóvenes', 'Pilotos en Gerentes por un Día, Conversaciones que Inspiran y otros espacios', 3),
  ('Comunicaciones', 'Posicionamiento SEO', 'Mayor alcance orgánico hacia nuevos públicos y potenciales aliados', 'Estrategia SEO y sistema de reutilización de los activos de GOYN', 1),
  ('Comunicaciones', 'Email marketing y relacionamiento', 'Actores informados, conectados y movilizados alrededor de las apuestas', 'Estrategia segmentada con contenidos periódicos para actores clave', 2),
  ('Comunicaciones', 'Ecosistema de contenidos', 'Presencia digital consistente que posiciona el conocimiento de GOYN', 'Sistema editorial con secciones articuladas a los activos de la iniciativa', 3),
  ('Gestión de conocimiento', 'Infraestructura de datos', 'La información deja de reconstruirse: disponible, trazable y consultable', 'MVP de Mapeo, Bitácora GOYN BAQ y modelo de datos de la iniciativa', 1),
  ('Gestión de conocimiento', 'Solución MEL transferible', 'Las organizaciones miden sus acciones sin depender de GOYN', 'Kits MEL, estándar mínimo de medición y ruta de acompañamiento', 2),
  ('Gestión de conocimiento', 'Conocimiento sobre juventudes', 'Evidencia con periodicidad definida que orienta decisiones del ecosistema', 'Informe Anual 2027, Cuaderno de Aprendizajes y agenda de aprendizaje', 3),
  ('Impacto colectivo', 'Sostenibilidad financiera', 'Nuevas fuentes efectivamente vinculadas a la operación', 'Ruta 2026-2028 validada, con mecanismos de financiación en ejecución', 1),
  ('Impacto colectivo', 'Sistema de gestión de alianzas', 'Las coordinaciones registran y consultan su relacionamiento con aliados', 'Sistema construido y operando, como evolución del piloto 2026', 2),
  ('Impacto colectivo', 'Incidencia electoral', 'Agenda juvenil posicionada ante los actores del proceso electoral', 'Ruta de incidencia implementada durante el proceso electoral 2027', 3),
  ('Impacto colectivo', 'Plataforma de gobernanza', 'Mesas temáticas con resultados tangibles y mayor involucramiento', 'Instancias fortalecidas sobre la línea base de cierre de 2026', 4),
  ('Involucramiento juvenil', 'Capacidades del GAJ', 'Un GAJ renovado y con capacidad de incidencia local', 'Ingreso de 10 nuevos integrantes, plan de fortalecimiento y de visibilidad', 1),
  ('Involucramiento juvenil', 'Liderazgo juvenil en la red', 'La red suma liderazgos juveniles y trabajo entre pares', 'Metodología de réplica implementada por el GAJ, con 10 jóvenes formados', 2),
  ('Involucramiento juvenil', 'Fortalecimiento del fondo YIF', 'Fondo con al menos dos aliados que aportan recursos', 'Fondo 2027 co-diseñado con el GAJ y 2 aliados, convocatoria implementada', 3)
) as v (coordinacion, nombre, resultado, producto, orden)
join public.coordinaciones c on c.nombre = v.coordinacion
on conflict (coordinacion_id, nombre, anio) do update
  set resultado_esperado = excluded.resultado_esperado,
      producto_clave     = excluded.producto_clave,
      orden              = excluded.orden;
