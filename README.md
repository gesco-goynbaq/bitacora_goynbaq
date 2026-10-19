# Bitácora GOYN BAQ

Plataforma marco de GOYN Barranquilla para gestionar el plan de trabajo: prioridades, acciones, hitos verificables, reportes de avance y presupuesto, con acceso exclusivo para correos `@goynbarranquilla.org`.

Desarrollo de Gestión de Conocimiento. Fase 1 de 3.

## Qué incluye la fase 1

| Espacio | Para qué sirve |
| --- | --- |
| Home pública | Explica la herramienta y da acceso. No muestra datos internos. |
| Acceso | Correo institucional y código de 6 dígitos (o enlace) enviado al correo. Sin contraseñas. |
| Perfil | Nombre, cargo y coordinación, la primera vez que alguien entra. |
| Mi espacio | Hitos pendientes, lo que vence en 7 días, vencidos, acciones a cargo y avance de la coordinación. |
| Plan GOYN BAQ | Las 24 prioridades 2027 de las 8 coordinaciones (Pathways y Habilitantes), con avance y presupuesto. |
| Mi coordinación | Plan de trabajo del equipo: crear y editar acciones, hitos, responsables, fechas y presupuesto. |
| Mis compromisos | Hitos a cargo de la persona, agrupados por vencimiento, con evidencias y reportes. |

El avance se calcula con hitos verificables (sí o no): los hitos alimentan la acción, las acciones la prioridad, y las prioridades la coordinación.

Fases siguientes: tablero de resultados e indicadores, repositorio (fase 2); comunidad y calendario (fase 3).

## Cómo funciona hoy: modo demostración

Mientras `js/config.js` no tenga los datos de Supabase, la plataforma corre en **modo demostración**:

* Los datos se guardan solo en el navegador de quien la usa.
* No se envían correos: se entra con cualquier correo `@goynbarranquilla.org` y el código `123456`.
* La primera persona que entra en ese navegador queda como administración.

Sirve para recorrer la plataforma y ajustarla con el equipo antes de conectar la base de datos.

## Publicar en GitHub Pages

1. En el repositorio: **Settings**, luego **Pages**.
2. En *Build and deployment*, *Source*: **Deploy from a branch**.
3. *Branch*: **main**, carpeta **/ (root)**, y **Save**.
4. En uno o dos minutos queda en `https://gesco-goynbaq.github.io/bitacora_goynbaq/`.

Cada cambio que se suba a `main` se publica solo.

## Conectar Supabase (datos reales y correos)

Hacerlo con una cuenta institucional de GOYN, no personal.

1. **Crear el proyecto** en [supabase.com](https://supabase.com). Región sugerida: *South America (São Paulo)*.
2. **Crear la base de datos.** En *SQL Editor*, ejecutar en orden:
   * `supabase/01_esquema.sql` (tablas, permisos y registro de cambios)
   * `supabase/02_semilla.sql` (las 8 coordinaciones y 24 prioridades 2027)
3. **Configurar el acceso** en *Authentication*:
   * *Sign In / Providers*: dejar activo **Email**.
   * *URL Configuration*: en *Site URL* y en *Redirect URLs* poner la dirección de GitHub Pages.
   * *Emails*, plantilla *Magic Link*: incluir el código con `{{ .Token }}`. Texto sugerido:
     > Tu código para entrar a la Bitácora GOYN BAQ es **{{ .Token }}**. También puedes entrar con este enlace: {{ .ConfirmationURL }}
   * *Hooks*: si está disponible **Before User Created**, elegir la función `hook_validar_dominio`. Así nadie con otro dominio llega a crear cuenta. Aunque no se active, las políticas de la base de datos ya impiden que un correo externo vea o cambie información.
   * *SMTP Settings*: conectar un servicio de correo propio (un buzón de Microsoft 365 de GOYN o un servicio como Resend). El correo gratuito de Supabase tiene un límite bajo de envíos por hora y es solo para pruebas.
4. **Pegar las llaves** en `js/config.js`: `SUPABASE_URL` y `SUPABASE_ANON_KEY` (en *Project Settings*, *API*). La clave *anon* es pública por diseño; la seguridad la dan las políticas de la base de datos.
5. **Nombrar la primera administración.** Después de que la persona entre por primera vez, ejecutar en *SQL Editor*:
   ```sql
   update public.perfiles set rol = 'admin' where email = 'yrojas@goynbarranquilla.org';
   ```

## Roles y permisos

| Rol | Puede |
| --- | --- |
| Administración | Todo: editar cualquier coordinación, cambiar roles, borrar. |
| Líder de coordinación | Crear, editar y borrar acciones e hitos de su coordinación; editar sus prioridades. |
| Miembro | Crear y editar acciones e hitos de su coordinación; actualizar lo que tiene a su cargo en otras. |
| Solo lectura | Consultar. |

Cualquier persona del equipo puede reportar avance. Nadie puede cambiarse el rol a sí misma. Estas reglas viven en la base de datos (`supabase/01_esquema.sql`), no solo en la pantalla.

## Estructura del código

```
index.html                 entrada de la aplicación
css/estilos.css            identidad visual
js/config.js               llaves de Supabase y dominio permitido
js/seed.js                 planeación 2027 (coordinaciones y prioridades)
js/data.js                 capa de datos: modo demostración o Supabase
js/app.js                  vistas, rutas y formularios
supabase/01_esquema.sql    tablas, permisos, disparadores y registro de cambios
supabase/02_semilla.sql    semilla generada desde js/seed.js
herramientas/generar-semilla.mjs
```

Si cambia la planeación, se edita `js/seed.js` y se regenera la semilla con `node herramientas/generar-semilla.mjs`.

No requiere instalación ni compilación: son archivos estáticos.
