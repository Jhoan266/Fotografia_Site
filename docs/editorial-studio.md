# Estudio de contenido de Fotografia

El estudio se agrega en /es/studio, /en/studio y /fr/studio. El administrador
encuentra el acceso en la barra lateral de su panel. La cuenta ADMIN representa
al propietario. Puede habilitar cuentas individuales existentes como
disenadores desde el apartado Acceso de disenadores del estudio.

## Uso

1. Elige el idioma y modulo. Los campos corresponden a las secciones existentes
   de la portada. Busca por etiqueta y edita texto, imagen, texto alternativo,
   datos de contacto, SEO o fuentes aprobadas.
2. Guarda el borrador o pulsa Guardar y ver cambios. El guardado compara la
   revision del editor con la del servidor. Si hay conflicto, el texto pendiente
   permanece en el navegador. Descargar cambios genera una copia JSON local.
3. Revisa la misma portada con borradores en escritorio, tablet y movil.
4. El propietario publica la revision guardada. Recuperar una version del
   historial crea un borrador y requiere publicar despues para cambiar la web.

Cada idioma guarda borrador y publicacion por separado. El historial muestra
las 50 entradas recientes y conserva las anteriores en PostgreSQL. Los cambios
de publicacion se leen sin cache en las siguientes solicitudes.

## Biblioteca

En Imagenes puedes subir JPEG, PNG o WebP de hasta 10 MiB y 64 megapixeles.
El servidor corrige orientacion y genera WebP sin metadatos. Copia la direccion
de la carga al campo de imagen correspondiente y guarda el modulo.

Las imagenes del borrador requieren sesion del estudio. Cuando el propietario
publica un modulo de imagenes que referencia una carga, la web puede mostrarla
publicamente. La biblioteca editorial y la boveda del cliente usan rutas y
permisos separados. Las 50 cargas recientes se muestran como accesos rapidos.

## Recorrido y lanzamiento

Presentar web abre la portada con el borrador y permite usar los filtros y
fichas del portafolio. Incluye muestras con busqueda, favoritas y seleccion
en memoria, y un formulario que valida datos ficticios. El recorrido exige
sesion y bloquea enlaces externos y envios reales. El menu permite volver al
editor y usar pantalla completa.

Publicacion del sitio permite elegir Web completa o Proximamente y habilitar
el contacto con un control independiente. La vista privada muestra la web
completa aunque la portada publica este en Proximamente.

## Despliegue y verificacion

Aplica prisma migrate deploy antes de iniciar la version. build:hostinger ya
incluye ese paso. La base y los archivos editoriales se incluyen en las copias
existentes de PostgreSQL y del almacenamiento.

tests/admin-docker-smoke.mjs cubre cuentas distintas, borrador privado,
publicacion autorizada, conflictos concurrentes, restauracion, imagenes privadas,
modo de lanzamiento y cabeceras de previsualizacion, junto con los paneles
actuales. Se necesitan las credenciales ficticias y Docker aislado descritos en
README.md. El documento CASALTO se adapta a las secciones de esta web, usando
PostgreSQL como almacen editorial.
