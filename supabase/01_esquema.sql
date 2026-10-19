-- =====================================================================
-- Bitácora GOYN BAQ · Esquema de base de datos (fase 1)
-- Ejecutar en Supabase: SQL Editor > New query > pegar todo > Run.
-- Es idempotente en lo posible: se puede volver a ejecutar sin perder datos.
-- =====================================================================

-- gen_random_uuid() es nativo en Postgres 13+ (Supabase lo incluye).

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table if not exists public.coordinaciones (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  categoria   text not null check (categoria in ('pathways', 'habilitantes')),
  orden       int  not null default 0,
  creado      timestamptz not null default now()
);

create table if not exists public.perfiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  nombre          text,
  cargo           text,
  coordinacion_id uuid references public.coordinaciones (id) on delete set null,
  rol             text not null default 'miembro'
                  check (rol in ('admin', 'lider', 'miembro', 'lector')),
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now()
);

create table if not exists public.prioridades (
  id                 uuid primary key default gen_random_uuid(),
  coordinacion_id    uuid not null references public.coordinaciones (id) on delete cascade,
  nombre             text not null,
  resultado_esperado text,
  producto_clave     text,
  anio               int  not null default 2027,
  orden              int  not null default 0,
  creado             timestamptz not null default now(),
  actualizado        timestamptz not null default now(),
  unique (coordinacion_id, nombre, anio)
);

-- Coordinaciones que aportan a una prioridad liderada por otra.
create table if not exists public.prioridad_aportes (
  prioridad_id    uuid not null references public.prioridades (id) on delete cascade,
  coordinacion_id uuid not null references public.coordinaciones (id) on delete cascade,
  primary key (prioridad_id, coordinacion_id)
);

create table if not exists public.acciones (
  id                    uuid primary key default gen_random_uuid(),
  prioridad_id          uuid not null references public.prioridades (id) on delete cascade,
  nombre                text not null,
  descripcion           text,
  responsable_id        uuid references public.perfiles (id) on delete set null,
  fecha_inicio          date,
  fecha_fin             date,
  estado                text not null default 'por_iniciar'
                        check (estado in ('por_iniciar', 'en_curso', 'completada', 'en_riesgo', 'cancelada')),
  presupuesto_planeado  numeric(16, 0) not null default 0 check (presupuesto_planeado >= 0),
  presupuesto_ejecutado numeric(16, 0) not null default 0 check (presupuesto_ejecutado >= 0),
  fuente_financiacion   text,
  creado_por            uuid default auth.uid() references public.perfiles (id) on delete set null,
  creado                timestamptz not null default now(),
  actualizado           timestamptz not null default now()
);

create table if not exists public.hitos (
  id              uuid primary key default gen_random_uuid(),
  accion_id       uuid not null references public.acciones (id) on delete cascade,
  nombre          text not null,
  trimestre       text check (trimestre in ('T1', 'T2', 'T3', 'T4')),
  fecha_limite    date,
  responsable_id  uuid references public.perfiles (id) on delete set null,
  cumplido        boolean not null default false,
  fecha_cumplido  date,
  evidencia_url   text,
  creado_por      uuid default auth.uid() references public.perfiles (id) on delete set null,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now()
);

create table if not exists public.reportes (
  id            uuid primary key default gen_random_uuid(),
  accion_id     uuid not null references public.acciones (id) on delete cascade,
  autor_id      uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  texto         text not null,
  evidencia_url text,
  creado        timestamptz not null default now()
);

-- Preparada para la fase 2 (tablero de resultados).
create table if not exists public.indicadores (
  id            uuid primary key default gen_random_uuid(),
  prioridad_id  uuid not null references public.prioridades (id) on delete cascade,
  nombre        text not null,
  unidad        text,
  linea_base    numeric,
  meta          numeric,
  valor_actual  numeric,
  actualizado   timestamptz not null default now()
);

create table if not exists public.bitacora_cambios (
  id           bigserial primary key,
  tabla        text not null,
  registro_id  uuid,
  operacion    text not null,
  usuario_id   uuid,
  datos        jsonb,
  fecha        timestamptz not null default now()
);

create index if not exists acciones_prioridad_idx  on public.acciones (prioridad_id);
create index if not exists acciones_responsable_idx on public.acciones (responsable_id);
create index if not exists hitos_accion_idx        on public.hitos (accion_id);
create index if not exists hitos_responsable_idx   on public.hitos (responsable_id);
create index if not exists reportes_accion_idx     on public.reportes (accion_id);
create index if not exists cambios_fecha_idx       on public.bitacora_cambios (fecha desc);

-- ---------------------------------------------------------------------
-- Funciones de apoyo para permisos
-- (security definer para leer perfiles sin recursión en las políticas)
-- ---------------------------------------------------------------------

create or replace function public.es_goyn()
returns boolean language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@goynbarranquilla.org', false);
$$;

create or replace function public.mi_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.mi_coordinacion()
returns uuid language sql stable security definer set search_path = public as $$
  select coordinacion_id from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_goyn() and coalesce(public.mi_rol() = 'admin', false);
$$;

-- Admin edita todo; líderes y miembros editan lo de su coordinación.
create or replace function public.edita_coordinacion(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_goyn() and (
    public.es_admin()
    or (public.mi_rol() in ('lider', 'miembro') and public.mi_coordinacion() = c)
  );
$$;

create or replace function public.coord_de_prioridad(p uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coordinacion_id from public.prioridades where id = p;
$$;

create or replace function public.coord_de_accion(a uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select pr.coordinacion_id
  from public.acciones ac join public.prioridades pr on pr.id = ac.prioridad_id
  where ac.id = a;
$$;

create or replace function public.responsable_de_accion(a uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select responsable_id from public.acciones where id = a;
$$;

-- ---------------------------------------------------------------------
-- Disparadores
-- ---------------------------------------------------------------------

-- Crea el perfil cuando alguien entra por primera vez.
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Nadie se asigna un rol a sí mismo: solo administración cambia roles.
-- Desde el SQL Editor de Supabase (sin usuario en sesión) sí se permite,
-- para poder nombrar al primer administrador.
create or replace function public.proteger_rol()
returns trigger language plpgsql security definer set search_path = public as $$
declare desde_app boolean := auth.uid() is not null;
begin
  if not desde_app or public.es_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rol := 'miembro';
  else
    if new.rol is distinct from old.rol then
      raise exception 'Solo administración puede cambiar roles';
    end if;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_rol on public.perfiles;
create trigger proteger_rol
  before insert or update on public.perfiles
  for each row execute function public.proteger_rol();

-- Fecha de última actualización.
create or replace function public.marcar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['perfiles', 'prioridades', 'acciones', 'hitos', 'indicadores'] loop
    execute format('drop trigger if exists marcar_actualizado on public.%I', t);
    execute format('create trigger marcar_actualizado before update on public.%I
                    for each row execute function public.marcar_actualizado()', t);
  end loop;
end $$;

-- Registro de cambios: quién cambió qué y cuándo.
create or replace function public.registrar_cambio()
returns trigger language plpgsql security definer set search_path = public as $$
declare fila jsonb;
begin
  fila := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.bitacora_cambios (tabla, registro_id, operacion, usuario_id, datos)
  values (tg_table_name, (fila ->> 'id')::uuid, tg_op, auth.uid(), fila);
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['prioridades', 'acciones', 'hitos', 'reportes', 'indicadores'] loop
    execute format('drop trigger if exists registrar_cambio on public.%I', t);
    execute format('create trigger registrar_cambio after insert or update or delete on public.%I
                    for each row execute function public.registrar_cambio()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Bloqueo de dominios ajenos al crear usuarios (Auth Hook)
-- Activar en: Authentication > Hooks > "Before User Created" > esta función.
-- Aunque no se active, las políticas de abajo impiden leer o escribir datos
-- a cualquier correo que no sea @goynbarranquilla.org.
-- ---------------------------------------------------------------------

create or replace function public.hook_validar_dominio(event jsonb)
returns jsonb language plpgsql as $$
declare correo text := lower(coalesce(event -> 'user' ->> 'email', ''));
begin
  if correo like '%@goynbarranquilla.org' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Solo pueden ingresar correos @goynbarranquilla.org'
  ));
end;
$$;

grant execute on function public.hook_validar_dominio(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_validar_dominio(jsonb) from authenticated, anon, public;

-- ---------------------------------------------------------------------
-- Seguridad por filas (RLS)
-- ---------------------------------------------------------------------

alter table public.coordinaciones    enable row level security;
alter table public.perfiles          enable row level security;
alter table public.prioridades       enable row level security;
alter table public.prioridad_aportes enable row level security;
alter table public.acciones          enable row level security;
alter table public.hitos             enable row level security;
alter table public.reportes          enable row level security;
alter table public.indicadores       enable row level security;
alter table public.bitacora_cambios  enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('coordinaciones','perfiles','prioridades','prioridad_aportes','acciones',
                      'hitos','reportes','indicadores','bitacora_cambios')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Lectura: todo el equipo con correo institucional.
create policy leer on public.coordinaciones    for select to authenticated using (public.es_goyn());
create policy leer on public.perfiles          for select to authenticated using (public.es_goyn());
create policy leer on public.prioridades       for select to authenticated using (public.es_goyn());
create policy leer on public.prioridad_aportes for select to authenticated using (public.es_goyn());
create policy leer on public.acciones          for select to authenticated using (public.es_goyn());
create policy leer on public.hitos             for select to authenticated using (public.es_goyn());
create policy leer on public.reportes          for select to authenticated using (public.es_goyn());
create policy leer on public.indicadores       for select to authenticated using (public.es_goyn());
create policy leer on public.bitacora_cambios  for select to authenticated using (public.es_goyn());

-- Coordinaciones: solo administración.
create policy escribir on public.coordinaciones for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Perfiles: cada persona edita el suyo; administración edita todos.
create policy crear_propio on public.perfiles for insert to authenticated
  with check (public.es_goyn() and id = auth.uid());
create policy editar_propio on public.perfiles for update to authenticated
  using (public.es_goyn() and (id = auth.uid() or public.es_admin()))
  with check (public.es_goyn() and (id = auth.uid() or public.es_admin()));

-- Prioridades e indicadores: administración o líder de la coordinación.
create policy escribir on public.prioridades for all to authenticated
  using (public.es_admin() or (public.mi_rol() = 'lider' and public.mi_coordinacion() = coordinacion_id))
  with check (public.es_admin() or (public.mi_rol() = 'lider' and public.mi_coordinacion() = coordinacion_id));

create policy escribir on public.prioridad_aportes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy escribir on public.indicadores for all to authenticated
  using (public.edita_coordinacion(public.coord_de_prioridad(prioridad_id)))
  with check (public.edita_coordinacion(public.coord_de_prioridad(prioridad_id)));

-- Acciones: la coordinación dueña; la persona responsable puede actualizarla.
create policy crear on public.acciones for insert to authenticated
  with check (public.edita_coordinacion(public.coord_de_prioridad(prioridad_id)));
create policy editar on public.acciones for update to authenticated
  using (public.edita_coordinacion(public.coord_de_prioridad(prioridad_id))
         or (public.es_goyn() and responsable_id = auth.uid()))
  with check (public.edita_coordinacion(public.coord_de_prioridad(prioridad_id))
         or (public.es_goyn() and responsable_id = auth.uid()));
create policy borrar on public.acciones for delete to authenticated
  using (public.es_admin()
         or (public.mi_rol() = 'lider' and public.mi_coordinacion() = public.coord_de_prioridad(prioridad_id)));

-- Hitos: la coordinación dueña, quien responde por la acción o por el hito.
create policy crear on public.hitos for insert to authenticated
  with check (public.edita_coordinacion(public.coord_de_accion(accion_id))
              or (public.es_goyn() and public.responsable_de_accion(accion_id) = auth.uid()));
create policy editar on public.hitos for update to authenticated
  using (public.edita_coordinacion(public.coord_de_accion(accion_id))
         or (public.es_goyn() and (responsable_id = auth.uid()
             or public.responsable_de_accion(accion_id) = auth.uid())))
  with check (public.edita_coordinacion(public.coord_de_accion(accion_id))
         or (public.es_goyn() and (responsable_id = auth.uid()
             or public.responsable_de_accion(accion_id) = auth.uid())));
create policy borrar on public.hitos for delete to authenticated
  using (public.edita_coordinacion(public.coord_de_accion(accion_id))
         or (public.es_goyn() and public.responsable_de_accion(accion_id) = auth.uid()));

-- Reportes de avance: cualquiera del equipo reporta; cada quien borra los suyos.
create policy crear on public.reportes for insert to authenticated
  with check (public.es_goyn() and autor_id = auth.uid());
create policy borrar on public.reportes for delete to authenticated
  using (public.es_goyn() and (autor_id = auth.uid() or public.es_admin()));
