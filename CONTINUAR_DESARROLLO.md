# Informe de desarrollo y punto de relevo

> **Entrada para continuar este proyecto en otro chat u otra IA.**
> Este informe transmite el trabajo realizado y el punto exacto donde se dejó.
> No es un protocolo de coordinación de agentes ni supone que varias IA estén trabajando simultáneamente.
>
> Actualizado: **28 de noviembre de 2026, Europe/Madrid**.
> Las comprobaciones de despliegue y pruebas aquí indicadas corresponden al cierre del módulo de recuperación del cliente.

## 1. Leer primero: dónde quedó el desarrollo

| Dato | Estado comprobado al redactar este informe |
|---|---|
| Repositorio | https://github.com/Jhoan266/Fotografia_Site |
| Web publicada | https://lightslategrey-caribou-607812.hostingersite.com/es |
| Última funcionalidad terminada | Recuperación asistida de contraseña del cliente |
| Última rama funcional | `security/client-password-recovery` |
| Último commit funcional publicado | `2271542da3d18cfe79459aa800cf9f183ad9a0f1` |
| PR funcional | [#46](https://github.com/Jhoan266/Fotografia_Site/pull/46), abierto y apilado sobre #45 |
| Build de Hostinger | `01a21f35-4b15-7103-bce7-a9f67fb086ee`, completado |
| Archivo desplegado | `fotografia_20261127_password_recovery.zip` |
| Última CI funcional | [46078925730](https://github.com/Jhoan266/Fotografia_Site/actions/runs/46078925730): verify, restore y app-smoke correctos |
| Rama de este informe | `docs/continuity-handoff`, basada en la rama funcional anterior |
| PR del informe | [#47](https://github.com/Jhoan266/Fotografia_Site/pull/47), documentación publicada en GitHub |
| Trabajo funcional sin terminar | Ninguno dentro del módulo #46. El correo automático sigue pendiente. |
| Tarea inmediatamente anterior al relevo | Informe creado, enlazado desde README y subido a GitHub en el PR #47. Solo documentación; no requiere desplegar la web. |

**Distinción esencial:** que una rama esté publicada en Hostinger no significa que su PR esté fusionado en main. La web actual contiene módulos posteriores a main. Empezar una nueva implementación desde main puede perder trabajo ya publicado.

La rama de documentación contiene el último código funcional más este informe. Al retomarlo, verificar las ramas remotas y el despliegue actual: esta tabla es una fotografía del estado, no una comprobación en tiempo real.

## 2. Qué quiere el usuario

- Una plataforma para **un solo negocio fotográfico**, integrada con su web actual. No es un SaaS con registro de múltiples fotógrafos.
- Portafolio público, panel del fotógrafo, portal de clientes, sesiones, fotos privadas y bóveda organizada.
- Ampliar progresivamente capacidades tomando Pixieset como referencia funcional y estética, **sin copiarlo literalmente** ni sustituir la aplicación existente.
- Conservar todos los apartados necesarios y añadir capacidades. **Sin gestión de inventario.**
- Diseño elegante, profesional y centrado en fotografía. El último rediseño usa marfil cálido, verde profundo, imágenes grandes y tipografía editorial; los datos operativos quedan en segundo plano.
- Fotos nítidas para revisar, originales protegidos y marca de agua automática al subir/consultar, sin trabajo manual por foto.
- Desarrollo modular: corregir o añadir un módulo, probarlo, verificarlo y continuar.
- Comunicación en español, breve y sencilla. El usuario pidió ahorrar tokens y no quiere volver a explicar toda la historia.

El usuario ha autorizado previamente publicar cambios en **este mismo sitio temporal de Hostinger**. Eso no autoriza compras, nuevos servicios de pago, envío de mensajes a personas, eliminación de datos reales o cambios en otros sitios. No solicitar ni poner contraseñas o claves en el chat.

## 3. Qué está implementado

### Web pública y editor

- Portada, servicios, portafolio con filtros y visor, presentación del fotógrafo, proceso y contacto.
- ES/EN/FR. Textos base en `messages/`; contenido editable guardado por idioma en PostgreSQL.
- Editor en `/{locale}/studio`: borradores, publicación, historial, control de revisiones concurrentes, biblioteca editorial y modo Próximamente.
- Vista previa y presentación privadas. Las imágenes editoriales de borrador y las fotos del cliente tienen permisos y rutas separados.
- ADMIN propietario; cuentas CLIENT pueden recibir permiso editorial mediante `editorialDesigner`, sin convertirse en administradores.

### Fotógrafo y fotografías

- Alta de clientes y sesiones; estados DRAFT, DELIVERED y ARCHIVED.
- Subida JPEG/PNG/WebP, validaciones de tamaño y dimensiones, miniaturas, orden persistente y portadas elegibles.
- Bóveda por cliente y sesión, subálbumes, asignación y orden de fotografías.
- Papelera y restauración; autorización y verificación reciente para acciones sensibles.
- Ajustes de entrega: descargas, caducidad, texto y activación de marca de agua.
- Revisión de selección confirmada y exportación CSV/TXT para el flujo del fotógrafo.

### Cliente y entrega

- Solo ve sus sesiones entregadas y no caducadas.
- Favoritos, selección para álbum, comentarios, filtros, subálbumes y visor con teclado/foco.
- Confirmación final con versión y captura inmutable de la selección; el fotógrafo puede reabrirla.
- Descargas individuales y ZIP cuando el fotógrafo las permite.
- Registro agrupado de solicitudes de vista/descarga. No demuestra que una descarga terminara ni quién hizo una captura.
- Paquetes de álbum con solicitud pendiente. **No hay cobro real ni una tienda completa.**

### Acceso y recuperación: los dos últimos módulos

**PR #45 — contraseña personal:**

- Los clientes nuevos creados por administración tienen `mustChangePassword=true`.
- Antes de acceder a fotos o acciones privadas deben cambiar la clave temporal en `/{locale}/account/password`.
- Las cuentas anteriores conservan el acceso: no hubo rotación retroactiva.
- Cambio voluntario con contraseña actual, confirmación, origen exacto y límite de intentos.
- Al cambiar se revocan todas las sesiones y códigos de recuperación pendientes.
- Límite coherente de bcrypt: mínimo 12 caracteres y máximo 72 bytes UTF-8 para contraseñas nuevas. Login y verificación de bóveda rechazan entradas de más de 72 bytes, sin truncamiento.
- El inicio de sesión bloquea la fila de usuario y vuelve a comprobar el hash antes de crear sesión, para no dejar sesiones tardías con una contraseña anterior.
- Contraseñas históricas que excedieran 72 bytes necesitan restablecimiento por canal de confianza; no se migraron hashes automáticamente.

**PR #46 — recuperación asistida, ya publicada:**

- No hay proveedor de correo configurado. No se simula envío ni se afirma que se haya mandado un email.
- Fotógrafo: Clientes → Recuperar acceso → verificar contraseña → generar código.
- Exige sesión ADMIN con MFA y verificación reciente de contraseña.
- Código aleatorio de 256 bits, válido 15 minutos y de un solo uso. Solo su SHA-256 queda guardado.
- Un código nuevo anula el anterior. El código se comparte manualmente por canal privado después de comprobar la identidad del cliente; nunca va dentro de la URL.
- Cliente: «¿Olvidaste tu contraseña?» → `/{locale}/reset-password` → código y nueva contraseña.
- El consumo cambia la contraseña, elimina la obligación de cambio temporal y revoca todas las sesiones del cliente.
- Dos consumos concurrentes no pueden prosperar. Un cambio normal de contraseña invalida los códigos pendientes.
- **No recupera cuentas ADMIN ni segundo factor MFA.**
- Emitir un código no cambia la contraseña ni bloquea sesiones: esos efectos ocurren al utilizarlo correctamente.

## 4. Protección de fotos: comportamiento que debe conservarse

- Originales y miniaturas almacenados en un bucket privado S3-compatible de Supabase. Bucket configurado: `Fotografia` (respetar mayúsculas).
- Acceso a archivos a través de rutas autenticadas; no hacer público el bucket para resolver errores de imágenes.
- Vistas del cliente generadas desde el original: hasta 1200 px de lado mayor para portada/rejilla y 2560 para visor; sin ampliar originales pequeños.
- WebP lossless, orientación corregida y metadatos privados eliminados. No introducir desenfoque para la revisión normal.
- Marca de agua repetida e integrada en los píxeles, con texto configurable y código seudónimo por cliente/sesión. No contiene correo, IP o nombre.
- Si falla la generación, no se entrega una copia limpia como alternativa. Cambiar parámetros de la URL no elimina la marca.
- Nuevas sesiones: marca activa y descargas desactivadas; las antiguas conservan su permiso de descarga anterior.
- El fotógrafo ve sus imágenes sin marca. Las descargas finales autorizadas no llevan la marca y eliminan metadatos privados.
- Respuestas privadas sin almacenamiento en caché; API con `no-transform`.
- Límite persistente por cuenta y minuto: 600 solicitudes de vistas, 60 de descarga individual y 6 de ZIP. Las rutas alternativas de descarga comparten cupo. El fotógrafo no usa esos cupos.
- Generación de vistas limitada a 2 procesos simultáneos, cola acotada, tiempo/píxeles/bytes limitados y caché privada acotada.
- ZIP: máximo 500 fotos, 2 GiB y 10 minutos; una exportación por usuario y dos globales por proceso.
- Subidas de fotos: máximo 10 archivos, 20 MiB por archivo y 64 megapíxeles. La biblioteca editorial tiene límites propios; no confundir ambas rutas.

**No existe bloqueo fiable de capturas o grabaciones en esta web.** No prometer pantalla negra DRM ni que un recorte sea imposible de aprovechar. Una captura no puede ganar detalle al ampliarse, pero no puede garantizarse que resulte inútil. Tampoco pueden revocarse archivos ya descargados.

## 5. Arquitectura y mapa para encontrar el código

Stack declarado actualmente: Next.js 16.4.5, React 19.3.1, TypeScript, Prisma 6.19.3, PostgreSQL, next-intl, bcryptjs, iron-session, Sharp y Archiver. Hostinger usa Node.js 22. Las versiones exactas instaladas las fija `package-lock.json`.

Leer `AGENTS.md` y las guías locales de `node_modules/next/dist/docs/` antes de modificar APIs de Next: esta versión no debe asumirse idéntica a versiones anteriores.

| Ubicación | Responsabilidad |
|---|---|
| `src/app/[locale]/` | Páginas ES/EN/FR |
| `.../admin/` | Inicio, clientes, sesiones, detalle y bóveda del fotógrafo |
| `.../app/` | Portal y galerías del cliente; la ruta real es **app**, no client |
| `.../studio/` | Editor, vista previa y presentación |
| `.../account/password/` | Cambio autenticado/primer acceso |
| `.../reset-password/` | Recuperación asistida pública por código |
| `src/app/api/media/[...path]/` | Entrega de imágenes y vistas protegidas |
| `src/app/api/photos/` | Subida, descarga, ZIP, favoritos, selección, comentarios y papelera |
| `src/app/api/clients/[id]/password-recovery/` | Emisión privilegiada de códigos; id corresponde a User, no ClientProfile |
| `src/modules/accounts/` | Cambio y recuperación de contraseña, códigos y transacciones |
| `src/modules/photos/` | Acceso, vistas protegidas, entrega, límites, auditoría y ZIP |
| `src/modules/projects/` | Consultas, entrega, organización y selección final |
| `src/modules/storage/` | Contrato local/S3 y almacenamiento de fotos |
| `src/modules/editorial/` | Esquema, permisos, borradores, publicación y equipo editorial |
| `src/lib/auth.ts`, `session.ts`, `session-cookie.ts` | Login, sesiones revocables y cookies |
| `src/lib/password-policy.ts` | Validación UTF-8/bcrypt |
| `src/lib/rate-limit.ts`, `login-source.ts`, `security.ts` | Límites persistentes, proxy/origen y validaciones |
| `src/components/admin/`, `client/`, `auth/` | Interacción de los paneles y acceso |
| `src/app/globals.css` | Estilos originales y utilidades compartidas |
| `src/app/editorial-refresh.css` | Rediseño público y acceso |
| `src/app/photography-workspaces.css` | Identidad actual de paneles, editor y formularios de cuenta |
| `src/lib/content.ts`, `messages/` | Contenido inicial y traducciones; los módulos publicados en DB pueden sobrescribir parte de él |
| `prisma/schema.prisma`, `prisma/migrations/` | Modelo y migraciones aditivas |
| `tests/admin-docker-smoke.mjs` | Integración funcional y de seguridad en entorno aislado |

Modelos principales: User, ClientProfile, Project, Photo, GalleryAlbum, Favorite, Selection, Comment, SelectionSubmission, Pack, ProjectPack, Order, AuthSession, RateLimitBucket, PhotoAuditEvent, PhotoDeliveryLog y modelos editoriales. Consultar el esquema para campos y relaciones exactos.

Hay **14 migraciones** al cierre de #46. Las dos últimas añaden `User.mustChangePassword` y `PasswordRecoveryToken` con RLS y relaciones a usuario destinatario/emisor.

## 6. Git y módulos recientes

Se conserva el flujo de ramas/PR apilados. Crear el siguiente módulo desde la cabeza que contenga el trabajo actual, con PR contra su base inmediata; main no se modifica directamente. Verificar las ramas antes de continuar y no fusionar toda la pila como parte implícita de una tarea pequeña.

Los módulos históricos de plataforma/seguridad se integraron mediante #33; #34 añadió soporte de acceso para hosting gestionado. Los PR antiguos pueden seguir figurando abiertos pese a esa integración: comprobar commits y bases, no deducir el estado solo por el contador de PR.

| PR | Rama | Resultado |
|---|---|---|
| [#35](https://github.com/Jhoan266/Fotografia_Site/pull/35) | `feature/content-studio` | Editor de contenido y vistas privadas |
| [#36](https://github.com/Jhoan266/Fotografia_Site/pull/36) | `security/effect-redos-fix` | Dependencias |
| [#37](https://github.com/Jhoan266/Fotografia_Site/pull/37) | `security/bounded-json-requests` | Cuerpos JSON acotados |
| [#38](https://github.com/Jhoan266/Fotografia_Site/pull/38) | `feature/gallery-delivery-controls` | Descargas y caducidad |
| [#39](https://github.com/Jhoan266/Fotografia_Site/pull/39) | `feature/gallery-albums-covers` | Subálbumes y portadas |
| [#40](https://github.com/Jhoan266/Fotografia_Site/pull/40) | `feature/selection-confirmation` | Selección final y exportaciones |
| [#41](https://github.com/Jhoan266/Fotografia_Site/pull/41) | `security/automatic-watermarked-previews` | Vistas protegidas automáticas |
| [#42](https://github.com/Jhoan266/Fotografia_Site/pull/42) | `ui/editorial-platform-redesign` | Rediseño de web pública |
| [#43](https://github.com/Jhoan266/Fotografia_Site/pull/43) | `security/client-photo-request-limits` | Cupos persistentes de entrega |
| [#44](https://github.com/Jhoan266/Fotografia_Site/pull/44) | `ui/photography-workspaces` | Paneles con colecciones fotográficas |
| [#45](https://github.com/Jhoan266/Fotografia_Site/pull/45) | `security/client-password-onboarding` | Contraseña personal y revocación |
| [#46](https://github.com/Jhoan266/Fotografia_Site/pull/46) | `security/client-password-recovery` | Recuperación asistida |

La base de #35 es `fix/hostinger-webpack`; después cada fila se apila sobre la anterior. Los PR #35–46 estaban abiertos al escribir este informe y el código funcional de #46 estaba desplegado por archivo.

## 7. Pruebas y evidencias existentes

La CI tiene tres trabajos en `.github/workflows/ci.yml`:

- **verify:** instalación reproducible, auditoría de dependencias, unitarias de seguridad/contraseñas/códigos, retención de backups, Prisma, migraciones, bootstrap de prueba, lint, tipos y build.
- **restore:** simulacro aislado PostgreSQL + almacenamiento S3-compatible, con origen detenido y comprobación de relaciones/bytes en destino.
- **app-smoke:** aplicación Docker aislada y flujos de autorización, MFA, revocación, subida, entrega, álbumes, selección, papelera, editor, primer acceso y recuperación concurrente.

La última CI funcional indicada en la tabla inicial terminó con los tres trabajos correctos. En Hostinger se probó #46 con cuentas ficticias: emisión autorizada, rechazo de anónimo/cliente, rechazo de recuperación ADMIN, almacenamiento del hash, sustitución de código, caducidad, consumo concurrente único, bloqueo de repetición, revocación de sesiones y login con nueva contraseña. Los datos temporales se eliminaron.

En #44 también se revisaron visualmente ordenador y móvil: inicios del fotógrafo/cliente, colecciones, clientes, bóveda, visor, navegación siguiente/Escape y desplazamiento a Mis sesiones. No hubo desbordamiento horizontal en el tamaño móvil comprobado. Esto no equivale a una auditoría completa de accesibilidad o a probar todos los navegadores.

Comprobaciones habituales en un checkout con dependencias y entorno de prueba:

~~~powershell
npm ci
npm run typecheck
npm run lint
npx --no-install tsx --test tests/password-policy.test.ts tests/recovery-token.test.ts
npm run build
~~~

El listado completo de pruebas y sus variables está en la CI. `admin-docker-smoke.mjs` exige explícitamente entorno local y credenciales ficticias; su configuración y rutas internas no se deben copiar sin más a producción. Para Docker usar un nombre de proyecto, base, bucket y puertos temporales aislados; nunca borrar volúmenes de otro proyecto para limpiar una prueba.

No ejecutar migraciones de desarrollo ni seeds sobre la base publicada. Antes de cualquier comando que use DATABASE_URL, identificar su destino sin imprimir la contraseña. `npm run build:hostinger` **aplica migraciones y ejecuta bootstrap**: no es un build inocuo sobre una DB desconocida.

## 8. Despliegue real y configuración

- Hostinger: aplicación Node.js/Next, Node 22, npm, salida `.next`, comando **build:hostinger**.
- PostgreSQL y objetos privados en Supabase. El sitio no utiliza una base PostgreSQL local de Hostinger.
- El despliegue que se ha usado con éxito es **archivo de fuentes**. No asumir que los pushes de estas ramas se despliegan solos: la integración Git anterior no garantizaba actualizar la versión actual.
- Consultar el build de Hostinger, esperar estado completed y comprobar comportamiento en la URL pública. Que una solicitud de build se acepte no demuestra que la web esté actualizada.
- `next.config.ts`: workers de build limitados a dos; fuente Noto Sans incluida en el trazado de la ruta de media.
- El build de Hostinger usa `next build --webpack`. Se corrigieron problemas previos de build usando esa configuración; no reemplazarla por suposición.

Para preparar un archivo se ha usado `git archive` sobre el commit aprobado. Debe contener fuentes y lockfile, no node_modules, .next, almacenamiento, copias, capturas, credenciales ni archivos .env*. `git archive` puede incluir .env.example porque está versionado: eliminar todas las entradas .env* del paquete de hosting. El último archivo funcional indicado en la tabla ya estaba limpio.

Con el conector Hostinger: leer primero el sitio/build actual; obtener credenciales temporales de carga; subir mediante TUS; consultar `hosting_nodejs_build-settings-from-archive`; iniciar `hosting_nodejs_start-build` con los valores anteriores; consultar `hosting_get-deployment` hasta completar. Las credenciales de carga no se escriben en documentación ni se muestran.

**Variables existentes, sin sus valores:** DATABASE_URL, SESSION_SECRET, ADMIN_TOTP_SECRETS, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL, MANAGED_HOSTING_LOGIN, STORAGE_DRIVER, STORAGE_LOCAL_PATH y S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY/S3_FORCE_PATH_STYLE.

La API de variables de Hostinger devuelve valores enmascarados y su operación de reemplazo sustituye el conjunto completo. No reenviar asteriscos como si fueran secretos ni eliminar claves desconocidas. En el entorno anterior había un archivo privado `.env.hostinger-prueba` **fuera del repositorio**; otra IA no debe asumir que puede acceder a él ni copiarlo a GitHub. No hay contraseñas, claves, códigos reales de recuperación ni cookies de sesión en este informe.

El acceso a Hostinger puede caducar. Si indica autenticación requerida, renovar la conexión con el usuario y después verificarla. En ocasiones la autorización no abría la ventana automáticamente. No interpretar una autorización caducada como pérdida del sitio o del plan.

## 9. Incidencias resueltas que evitan repetir trabajo

1. **Contraseñas largas:** aceptar 128 caracteres con bcrypt permitía ignorar el sufijo posterior a 72 bytes. Corregido en #45 para login, alta, cambio y bóveda; mantener pruebas con UTF-8 y emojis.
2. **Sesiones tardías:** comprobar contraseña y crear sesión sin serialización podía sobrevivir a un cambio concurrente. Corregido con bloqueo de User y comprobación del hash dentro de la transacción.
3. **Formulario de cambio bloqueado:** la prueba nativa sin JS quedaba esperando con los argumentos enlazados de la acción. Se resolvió usando acción directa con firma (estadoAnterior, FormData) y locale oculto validado, como el login. Los formularios nuevos de recuperación usan el mismo patrón. Los helpers HTTP de pruebas tienen timeout.
4. **ActionForm no equivale a formulario nativo de login:** su adaptador cliente usa JavaScript. Una prueba que posteaba su HTML como si fuera una acción nativa devolvía 400; no confundir un fallo del helper con un fallo del alta en el navegador.
5. **Cabeceras de media:** no-transform se perdía en la configuración compartida de API. Se corrigió también next.config.ts y se verificó en integración y en Hostinger.
6. **Fotos en pruebas:** para comprobar un original intacto, comparar con el objeto almacenado. No confundir las copias de entrega sin metadatos con los bytes del original.
7. **Correo ficticio con mayúsculas:** una prueba insertó un email directamente en DB con CLIENT en mayúsculas; el login lo normaliza a minúsculas y no lo encontraba. El alta real ya normaliza. Usar fixtures normalizadas.
8. **Contenidos publicados:** cambiar el valor inicial de un JSON/imagen no necesariamente modifica un módulo ya publicado en DB. Revisar ambos orígenes antes de concluir que el despliegue falló.

## 10. Lo que aún falta y no debe darse por completado

### Cierre de una primera versión profesional

- Sustituir identidad, contactos y material de muestra. La auditoría detectó el aviso placeholder, WhatsApp y correo de ejemplo, y una cuenta ADMIN de prueba.
- Remitente y proveedor de correo reales: recuperación automática, invitaciones y recordatorios **no están configurados**. La recuperación manual de #46 sí funciona.
- Copias automáticas de producción: acreditar copia conjunta DB + objetos, retención, ubicación privada separada y restauración real. Los simulacros locales/CI no prueban esa operación en Supabase. Una copia de DB no incluye los archivos de Storage.
- Información de privacidad y del negocio con datos reales. No inventar identidad, condiciones, datos fiscales o textos jurídicos definitivos.
- Monitorización y alertas de caída, errores, almacenamiento y fallos de backups. No se acreditó una configuración operativa completa.
- Prueba de carga/volumen representativo, conexión lenta y Safari/iPhone/Android. Las galerías grandes y todos los navegadores no están certificados por las pruebas actuales.
- Dominio definitivo y cierre del procedimiento de release/reversión.
- SEO y publicación: en la auditoría sitemap.xml y favicon.ico devolvían 404, faltaban canonical/Open Graph; robots.txt bloqueaba Googlebot. Revalidar antes de cambiar: el sitio sigue en pruebas.
- Endurecimiento de cabeceras: no se observó HSTS; la CSP pública solo contenía upgrade-insecure-requests. Los formularios de cuenta añaden noindex/no-store y recuperación no-referrer, pero no sustituyen una CSP completa.

No hay un módulo siguiente ya implementado en secreto ni un proveedor de correo pendiente de una simple activación: faltan datos/configuración reales. La siguiente mejora puede elegirse de esta lista; si requiere identidad, correo, un servicio de pago o decisiones de negocio, concretar solo ese dato y continuar lo que no dependa de él.

### Ampliación funcional tipo Pixieset

Pendientes: comunicación automática; agenda y reservas sin solapamientos; presupuestos, cuestionarios, contratos y facturas; pagos/anticipos con proveedor y webhooks verificados; tienda y gestión completa de pedidos; ampliación de páginas/blog/formularios/SEO; experiencia instalable y notificaciones si se mantienen en el alcance. IA de edición o Lightroom son integraciones futuras, no capacidades existentes.

No almacenar tarjetas. No describir una solicitud UNPAID de álbum como pago real. No comprar un servicio para desbloquear una función sin decisión del usuario.

## 11. Documentos complementarios

- [Plan funcional](docs/photography-platform-roadmap.md): alcance general; algunas descripciones del primer módulo son históricas. Para defaults actuales, usar código y este informe.
- [Editor de contenido](docs/editorial-studio.md).
- [Copias y restauración](docs/backup-restore.md): distinguir laboratorio de producción.
- [Vistas protegidas](docs/modules/protected-previews.md).
- [Álbumes y portadas](docs/modules/gallery-albums-covers.md).
- [Selección final](docs/modules/selection-confirmation.md).
- [Primer acceso y contraseñas](docs/modules/client-password-onboarding.md).
- [Recuperación asistida](docs/modules/client-password-recovery.md).
- [CI](.github/workflows/ci.yml), [esquema](prisma/schema.prisma) y [README](README.md).

Los documentos de módulos antiguos describen sus verificaciones de entonces; no son certificaciones permanentes. Ante contradicción, revisar el código, la configuración vigente y la última evidencia publicada.

## 12. Cómo retomar sin leer el chat anterior

1. Leer el bloque de relevo de abajo y la tabla inicial. Comprobar git status, rama y último commit antes de cambiar de checkout. Conservar cualquier trabajo sin confirmar de la sesión anterior.
2. Actualizar referencias remotas y contrastar las ramas/PR y el despliegue con los identificadores de este informe. No ejecutar reset/clean ni partir de main para «poner todo al día».
3. Abrir el módulo concreto en el mapa anterior y su documentación. No rehacer lo que ya está publicado.
4. Elegir el siguiente pendiente compatible con la petición más reciente del usuario y trabajar por módulo, con pruebas apropiadas. Si el usuario solo dice continuar, usar el último pendiente anotado, no una etapa histórica ya terminada.
5. Al cerrar el módulo, registrar aquí qué se cambió, rama/commit/PR, migración, pruebas, despliegue y qué falta. Si una prueba falla o una autorización está pendiente, anotarlo explícitamente.

Este archivo **no se actualiza solo**. Para que un relevo por falta de tokens sea útil, actualizar el bloque siguiente después de cada módulo y antes de cerrar una sesión cuando sea posible. El código sin confirmar y los procesos abiertos también forman parte del punto de relevo.

### Bloque de relevo actual

~~~text
FECHA: 28/11/2026 (Europe/Madrid)
ÚLTIMA PETICIÓN: Crear un informe en GitHub para que otra IA pueda continuar
cuando termine el contexto/tokens de la anterior. El usuario aclaró que NO
quiere reglas para coordinar varias IA, sino memoria y punto de continuación.

ÚLTIMO MÓDULO FUNCIONAL: #46 recuperación asistida del cliente, terminado,
publicado y verificado. Rama security/client-password-recovery.
COMMIT PUBLICADO: 2271542da3d18cfe79459aa800cf9f183ad9a0f1.
HOSTINGER: build 01a21f35-4b15-7103-bce7-a9f67fb086ee, completed.
CI FUNCIONAL: 46078925730, los tres trabajos correctos.

TRABAJO DE ESTE RELEVO: docs/continuity-handoff contiene este informe y el
acceso desde README. Consultar su PR y git log para el commit documental.
La documentación no cambia la versión publicada de la aplicación.

EN CURSO: no hay una funcionalidad a medio implementar dentro de #46.
DOCUMENTACIÓN TERMINADA: informe subido a GitHub en el PR #47.
PENDIENTE INMEDIATO: el siguiente módulo funcional aún no se ha iniciado.
DESPUÉS: continuar los pendientes de cierre descritos en la sección 10,
sin prometer correo automático antes de disponer de remitente/proveedor.

PRUEBAS/DATOS: fixtures del último chequeo publicado eliminadas; no reutilizar
códigos, cookies o contraseñas de prueba de chats. No se dejaron contenedores
QA de contraseña ni del rediseño para seguir trabajando.
BLOQUEOS: ninguno para leer y desarrollar. Correo automático depende de datos
y configuración reales. Copias/alertas de producción aún necesitan evidencia.
PREFERENCIA DEL USUARIO: respuestas cortas, español sencillo y ahorro de tokens.
~~~

### Plantilla breve para el próximo relevo

~~~text
Fecha y última petición del usuario:
Módulo y resultado real:
Rama / base / commit / PR:
Archivos modificados y cambios sin confirmar:
Migraciones y estado de aplicación:
Pruebas ejecutadas y resultados/fallos:
Publicado: sí/no; build, commit y verificación real:
Datos ficticios y procesos temporales: retirados/pendientes:
Qué falta exactamente y siguiente acción concreta:
Datos o autorización imprescindibles que aún no se tienen:
~~~

### Mensaje que el usuario puede dar a la siguiente IA

~~~text
Continúa el desarrollo de Jhoan266/Fotografia_Site. Lee primero el archivo
CONTINUAR_DESARROLLO.md de la rama docs/continuity-handoff y su bloque de relevo.
Verifica si existe una versión más reciente del informe y el estado del repo.
Retoma desde el último punto registrado, conservando la arquitectura, seguridad,
diseño y flujo de PR apilados existentes. No partas de main sin comprobar la pila.
No necesito volver a explicarte el historial. Responde en español y brevemente.
~~~
