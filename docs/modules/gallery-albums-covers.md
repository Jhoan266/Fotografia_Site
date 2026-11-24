# Subálbumes y portadas integrados

Ubicación: panel del fotógrafo → sesión → «Subálbumes y portada».

- Crear, renombrar y ordenar hasta 100 subálbumes por sesión.
- Mover hasta 500 fotos existentes a la vez; «Sin subálbum» permite desagrupar.
- Elegir una portada existente o volver a la primera foto disponible.
- Portada aplicada tanto a la galería como a la tarjeta del portal del cliente.
- El cliente puede filtrar por subálbum y combinarlo con favoritos/selección.
  El visor navega solo por el conjunto mostrado. Las descargas siguen usando
  la selección/favoritos de la sesión, no el filtro visual de subálbum.
- Eliminar un subálbum desagrupa las fotos; no elimina originales, miniaturas,
  comentarios, favoritos ni selecciones. No duplica ni mueve objetos del storage.
- Una portada en papelera deja de mostrarse y se sustituye por una foto activa.
- No hay enlaces públicos nuevos: los subálbumes heredan cliente, estado,
  caducidad y permisos de descarga de su sesión.

Seguridad: todas las mutaciones requieren ADMIN y origen válido, tienen límites
de frecuencia y tamaño, y se serializan por sesión en transacciones. Se validan
también fotos y álbumes de otras sesiones. Una clave foránea compuesta impide
asignar una foto a un álbum de otra sesión incluso a nivel de base de datos.
La nueva tabla tiene RLS habilitado. Migración aditiva; datos anteriores quedan
sin subálbum y con portada automática.

Pruebas: validación de comandos y límites, integración de CRUD/orden/portada,
aislamiento de sesiones, protección de clientes/anónimos/origen, integridad de
base de datos, traducciones, borrado sin pérdida y portada en papelera. Las
pruebas existentes de caducidad y descargas siguen ejecutándose.
