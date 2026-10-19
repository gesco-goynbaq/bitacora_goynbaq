// Estructura base de la planeación 2027 de GOYN Barranquilla.
// Fuente: "Resumen de Prioridades 2027", corte 9 de octubre de 2026.
// Este archivo alimenta el modo demostración y genera la semilla SQL de Supabase
// (ver herramientas/generar-semilla.mjs). Si cambia la planeación, se actualiza aquí.

export const ANIO_PLAN = 2027;

export const COORDINACIONES = [
  {
    nombre: 'Empleo joven',
    categoria: 'pathways',
    prioridades: [
      {
        nombre: 'Bilingüismo de ciudad',
        resultado: 'Más jóvenes acceden a empleo formal con el inglés como competencia bisagra',
        producto: 'Estrategia formulada y articulada, con hoja de ruta sobre su lugar en GOYN',
      },
      {
        nombre: 'Conexión oportuna con vacantes',
        resultado: 'Se reduce el tiempo entre vacante disponible y contratación',
        producto: 'Mecanismo operando, escalando el piloto de Zona Franca La Cayena',
      },
      {
        nombre: 'Prácticas de selección empresarial',
        resultado: 'Más jóvenes superan el filtro inicial del que hoy quedan excluidos',
        producto: 'Empresas sensibilizadas y empresas que modifican una práctica formal',
      },
    ],
  },
  {
    nombre: 'Emprendimiento juvenil',
    categoria: 'pathways',
    prioridades: [
      {
        nombre: 'Sistema unificado de registro',
        resultado: 'La oferta se diseña con información real y no con supuestos',
        producto: 'Instrumento de caracterización con línea base de emprendimientos',
      },
      {
        nombre: 'Integración a GOYN Conecta',
        resultado: 'Acceso en un solo lugar a la oferta y a rutas de derivación claras',
        producto: 'Plataforma con actores, programas y rutas de articulación operando',
      },
      {
        nombre: 'Uso del sistema de visibilidad',
        resultado: 'Emprendimientos que mejoran en ventas, productividad y conexiones',
        producto: 'Emprendimientos registrados con acceso a al menos una oportunidad',
      },
    ],
  },
  {
    nombre: 'Puentes a las oportunidades',
    categoria: 'pathways',
    prioridades: [
      {
        nombre: 'Fortalecimiento de la red comunitaria',
        resultado: 'Red con gobernanza definida, articulada con al menos 5 actores clave',
        producto: 'Gobernanza en operación, plan de capacidades e incentivos para la red',
      },
      {
        nombre: 'Seguimiento de trayectorias',
        resultado: '100 jóvenes identificados, referenciados y con seguimiento inicial',
        producto: 'Mecanismo diseñado, validado y pilotado con parte de la red',
      },
    ],
  },
  {
    nombre: 'Cambio de narrativa',
    categoria: 'pathways',
    prioridades: [
      {
        nombre: 'Transformación cultural en empresas',
        resultado: 'Evidencia de qué funciona para cambiar comportamientos de jóvenes y empresas',
        producto: 'Modelo construido desde el primer piloto, con ruta de escalamiento',
      },
      {
        nombre: 'Podcast y Laboratorio de Narrativas',
        resultado: 'Apuesta unificada de cambio narrativo liderada por jóvenes',
        producto: 'Laboratorio que forma a jóvenes en creación y producción de contenidos',
      },
      {
        nombre: 'Continuidad con ACOPI y ANDI',
        resultado: 'Mayor apertura de empresas hacia nuevas formas de relacionarse con jóvenes',
        producto: 'Pilotos en Gerentes por un Día, Conversaciones que Inspiran y otros espacios',
      },
    ],
  },
  {
    nombre: 'Comunicaciones',
    categoria: 'habilitantes',
    prioridades: [
      {
        nombre: 'Posicionamiento SEO',
        resultado: 'Mayor alcance orgánico hacia nuevos públicos y potenciales aliados',
        producto: 'Estrategia SEO y sistema de reutilización de los activos de GOYN',
      },
      {
        nombre: 'Email marketing y relacionamiento',
        resultado: 'Actores informados, conectados y movilizados alrededor de las apuestas',
        producto: 'Estrategia segmentada con contenidos periódicos para actores clave',
      },
      {
        nombre: 'Ecosistema de contenidos',
        resultado: 'Presencia digital consistente que posiciona el conocimiento de GOYN',
        producto: 'Sistema editorial con secciones articuladas a los activos de la iniciativa',
      },
    ],
  },
  {
    nombre: 'Gestión de conocimiento',
    categoria: 'habilitantes',
    prioridades: [
      {
        nombre: 'Infraestructura de datos',
        resultado: 'La información deja de reconstruirse: disponible, trazable y consultable',
        producto: 'MVP de Mapeo, Bitácora GOYN BAQ y modelo de datos de la iniciativa',
      },
      {
        nombre: 'Solución MEL transferible',
        resultado: 'Las organizaciones miden sus acciones sin depender de GOYN',
        producto: 'Kits MEL, estándar mínimo de medición y ruta de acompañamiento',
      },
      {
        nombre: 'Conocimiento sobre juventudes',
        resultado: 'Evidencia con periodicidad definida que orienta decisiones del ecosistema',
        producto: 'Informe Anual 2027, Cuaderno de Aprendizajes y agenda de aprendizaje',
      },
    ],
  },
  {
    nombre: 'Impacto colectivo',
    categoria: 'habilitantes',
    prioridades: [
      {
        nombre: 'Sostenibilidad financiera',
        resultado: 'Nuevas fuentes efectivamente vinculadas a la operación',
        producto: 'Ruta 2026-2028 validada, con mecanismos de financiación en ejecución',
      },
      {
        nombre: 'Sistema de gestión de alianzas',
        resultado: 'Las coordinaciones registran y consultan su relacionamiento con aliados',
        producto: 'Sistema construido y operando, como evolución del piloto 2026',
      },
      {
        nombre: 'Incidencia electoral',
        resultado: 'Agenda juvenil posicionada ante los actores del proceso electoral',
        producto: 'Ruta de incidencia implementada durante el proceso electoral 2027',
      },
      {
        nombre: 'Plataforma de gobernanza',
        resultado: 'Mesas temáticas con resultados tangibles y mayor involucramiento',
        producto: 'Instancias fortalecidas sobre la línea base de cierre de 2026',
      },
    ],
  },
  {
    nombre: 'Involucramiento juvenil',
    categoria: 'habilitantes',
    prioridades: [
      {
        nombre: 'Capacidades del GAJ',
        resultado: 'Un GAJ renovado y con capacidad de incidencia local',
        producto: 'Ingreso de 10 nuevos integrantes, plan de fortalecimiento y de visibilidad',
      },
      {
        nombre: 'Liderazgo juvenil en la red',
        resultado: 'La red suma liderazgos juveniles y trabajo entre pares',
        producto: 'Metodología de réplica implementada por el GAJ, con 10 jóvenes formados',
      },
      {
        nombre: 'Fortalecimiento del fondo YIF',
        resultado: 'Fondo con al menos dos aliados que aportan recursos',
        producto: 'Fondo 2027 co-diseñado con el GAJ y 2 aliados, convocatoria implementada',
      },
    ],
  },
];

export const CATEGORIAS = {
  pathways: { nombre: 'Pathways', descripcion: 'Las rutas de acceso a oportunidades' },
  habilitantes: { nombre: 'Habilitantes', descripcion: 'Las capacidades que sostienen los pathways' },
};
