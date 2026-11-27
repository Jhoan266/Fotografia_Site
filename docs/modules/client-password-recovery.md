# Recuperación asistida del cliente

Sin proveedor de correo configurado, el fotógrafo genera un código desde la
ficha del cliente tras volver a verificar su contraseña. Requiere sesión ADMIN
con MFA y verificación reciente. No permite recuperar administradores ni MFA.
El fotógrafo debe comprobar la identidad del cliente y comunicar el código
por un canal privado; la aplicación no envía mensajes ni promete enviar correo.

El código contiene 256 bits aleatorios, caduca en quince minutos y sirve una
sola vez. Solo su SHA-256 se guarda en una tabla con RLS. No aparece en URLs,
enlaces, logs o páginas públicas; se muestra únicamente al emitirlo. Un código
nuevo anula el anterior. Límites: doce emisiones por administrador y tres por
cliente cada hora; seis intentos de uso de códigos vigentes por cuenta cada
quince minutos. Los códigos desconocidos no crean contadores persistentes.

El cliente usa la página enlazada desde «Olvidé mi contraseña», con código y
nueva contraseña. No necesita recordar la antigua ni iniciar sesión. La
confirmación, límites de contraseña y origen se validan en servidor. Al consumir
el código se actualiza el hash, se desactiva la clave temporal y se revocan todas
las sesiones. Emisión, consumo, cambio normal e inicio de sesión se serializan
por usuario; dos consumos concurrentes no pueden prosperar. Un cambio normal
de contraseña también invalida los códigos pendientes.

Las cuentas anteriores, fotos y permisos no cambian al emitir un código.
Textos ES/EN/FR, noindex y private/no-store. El correo automático sigue pendiente
de configurar un remitente y un proveedor reales.
