# Vistas previas nítidas con marca de agua automática

Subir fotos sigue usando el formulario actual. Los originales y las miniaturas
guardadas no se modifican. Al consultar el portal, la galería o el visor como
CLIENT, el servidor genera una copia marcada desde el original. Esto también
protege las fotos ya subidas; no hay que volver a cargarlas.

## Calidad y entrega

- Sin desenfoque, ruido ni compresión con pérdida adicional en las copias:
  redimensionado proporcional y salida WebP lossless, conservando orientación
  y eliminando metadatos privados. No se amplían originales pequeños.
- Rejilla/portada: hasta 1200 píxeles en el lado mayor. Visor: hasta 2560.
  Estas son copias para pantalla, no archivos de resolución original.
- La marca semitransparente está repetida e integrada en los píxeles. Incluye
  texto configurable (inicialmente «VISTA PREVIA») y un código por cliente/sesión.
  No incluye correos, IP ni nombres del cliente.
- Nuevas sesiones: marca activada y descargas desactivadas. Las sesiones
  anteriores conservan sus permisos de descarga; las vistas previas pasan a
  estar marcadas automáticamente. Revisar los permisos antiguos si se desea
  convertir una entrega ya autorizada a modo de revisión.
- El fotógrafo puede cambiar el texto o desactivar la marca en los ajustes de
  entrega de cada sesión. Sigue viendo sus propios archivos sin marca.
- Las descargas autorizadas individuales/ZIP son versiones finales sin marca,
  con las protecciones y eliminación de metadatos que ya existían.

No hay detección o bloqueo de capturas ni grabaciones, ni pantalla negra DRM.
Una captura tiene la resolución que capturó el dispositivo: ampliarla no crea
detalle, pero no se puede garantizar que un recorte sea inutilizable o que una
marca sea imposible de eliminar. Tampoco se revocan archivos ya descargados.

## Seguridad y funcionamiento

La ruta comprueba propietario, estado, caducidad y permisos en cada solicitud,
antes de reutilizar una copia. Cambiar parámetros de la URL no desactiva la
marca. Si falla la generación, no se entrega una copia limpia como alternativa.
La caché privada incluye archivo, texto, código de cliente y tamaño; está limitada
a 48 MiB y 64 entradas con vigencia máxima de cinco minutos. La generación usa
dos generaciones simultáneas y una cola limitada, con límites de tiempo, píxeles y
bytes. Las respuestas llevan private/no-store.

El código usa HMAC con propósito separado; el panel del fotógrafo permite
relacionarlo con su cliente. Los registros de solicitudes conservan el código
usado, incluso si luego se cambia la clave de sesión. Son indicios de acceso
autorizado de esa cuenta, no prueba de quién realizó una captura o filtración.

## Registro de actividad

Solicitudes autorizadas de vistas previas, descarga individual y ZIP; agrupadas
por cuenta, sesión, foto/tipo y hora, con contador y fechas. El panel muestra los
20 registros recientes de la sesión. No acredita visualización ni descarga
completa. Se conserva en la base de datos de la sesión y se elimina al eliminarla.
La nueva tabla tiene RLS. No se añaden rastreadores externos.

## Fuente tipográfica

Noto Sans, The Noto Project Authors, SIL Open Font License 1.1. Copia íntegra de
la licencia en public/fonts/OFL.txt. Fuente obtenida del repositorio oficial:
https://github.com/google/fonts/tree/main/ofl/notosans

Se incluye en el despliegue para no depender de fuentes instaladas en Hostinger.
