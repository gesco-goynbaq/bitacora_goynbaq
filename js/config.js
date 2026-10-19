// Configuración de la Bitácora GOYN BAQ.
// Mientras SUPABASE_URL y SUPABASE_ANON_KEY estén vacías, la plataforma funciona
// en modo demostración: los datos se guardan solo en el navegador de quien la usa.
// Cuando exista el proyecto de Supabase, pegar aquí sus dos valores
// (Project Settings > API). La clave "anon" es pública por diseño: la seguridad
// la dan las políticas de supabase/01_esquema.sql.

export const CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  DOMINIO: 'goynbarranquilla.org',
};
