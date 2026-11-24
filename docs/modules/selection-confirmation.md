# Confirmación y exportación de selecciones

Integrado en las galerías y sesiones actuales, con traducciones ES/EN/FR.

## Cliente

Selecciona fotos con el control del visor y pulsa «Confirmar selección» en la
galería. La confirmación comprende todas las fotos seleccionadas de la sesión,
independientemente del filtro/subálbum visible. Se admiten de 1 a 500 fotos.
Mientras se guardan cambios no se confirma. Tras confirmar no se puede modificar
la selección; favoritos y comentarios siguen disponibles. Para cambiarla, el
fotógrafo debe reabrirla y el cliente recargar la galería.

## Fotógrafo

En la sesión aparece «Selección final»: lista confirmada, exportaciones CSV y TXT,
y reapertura. CSV incluye identificadores y nombres; TXT incluye un nombre por
línea para usar en el flujo de edición. Los nombres repetidos se distinguen por
su identificador en CSV. No es un plugin ni sincronización automática con Lightroom.
El CSV escapa comillas y neutraliza fórmulas con un prefijo de apóstrofo cuando
es necesario. Las exportaciones no incluyen claves ni URLs del almacenamiento.

Reabrir no borra la selección existente ni sus confirmaciones anteriores. El
cliente puede modificarla y volver a confirmar. Cada confirmación conserva una
copia de IDs/nombres, su versión, usuario y fecha, dentro de la sesión; cambiar
o enviar una foto a papelera posteriormente no reescribe esa copia. El historial
se conserva en base de datos mientras exista la sesión; esta entrega muestra la
última confirmación, sin interfaz de consulta del historial completo.

## Seguridad y pruebas

Confirmación solo para el cliente propietario de una sesión entregada y no
caducada. Reapertura/exportación solo para ADMIN. Se comprueba origen, tamaño,
frecuencia, versión y conjunto exacto de IDs. Un bloqueo transaccional de la
sesión serializa cambios y confirmaciones: dos pestañas no pueden confirmar un
estado distinto del que se ha guardado. La reapertura también comprueba versión.
RLS habilitado en la nueva tabla y respuestas privadas sin caché.

Pruebas de permisos, versiones obsoletas, listas incorrectas, confirmaciones y
selecciones concurrentes, carreras entre confirmar/cambiar, conservación de copias,
reapertura, caducidad y exportación segura, además de las pruebas existentes.
