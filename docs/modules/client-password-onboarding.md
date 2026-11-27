# Contraseñas personales y primer acceso

Los clientes nuevos creados desde administración deben sustituir su contraseña
temporal antes de acceder al portal, fotos, descargas o acciones privadas. Las
cuentas anteriores conservan el acceso; no se fuerza una rotación retroactiva.

La página de cambio exige sesión activa, contraseña actual, origen exacto,
confirmación coincidente y seis intentos como máximo por quince minutos.
El cambio actualiza el hash y revoca todas las sesiones en una transacción.
El inicio de sesión bloquea la fila de usuario y vuelve a comprobar el hash
antes de crear una sesión, evitando que una comprobación antigua sobreviva
a la rotación. Después hay que volver a entrar. No se modifican fotos.

Las contraseñas nuevas tienen un mínimo de doce caracteres y un máximo de
72 bytes UTF-8. Login, creación de cliente y verificación de bóveda rechazan
entradas superiores al límite de bcrypt, sin truncarlas. Las contraseñas
antiguas que excedieran ese límite requieren un restablecimiento administrativo
por un canal de confianza. No se cambian ni migran hashes existentes.

El cliente tiene acceso al cambio desde su menú de cuenta y desde el pie
del portal, también en móvil. El fotógrafo dispone de un enlace equivalente.
La página no se indexa y lleva private/no-store. Textos ES/EN/FR.

Este módulo no incluye recuperación por correo ni códigos de recuperación MFA.
Esos flujos necesitan un módulo separado y un proveedor de correo configurado.
