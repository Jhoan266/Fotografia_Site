# Copia y restauracion de Fotografia Site

Cada copia debe reunir PostgreSQL y el almacenamiento de fotos del mismo punto
de corte. El volcado incluye cuentas, proyectos, auditoria y estado de la
papelera. El almacenamiento incluye originales y miniaturas, tambien de las
fotos en papelera.

## Copia con almacenamiento local

Ejecuta los ejemplos en Bash desde el directorio de Compose, con el proyecto
de origen seleccionado. Usa un directorio nuevo y privado en un volumen
cifrado y confirma el nombre del volumen de fotos con `docker volume ls`.
Coordina una ventana de mantenimiento y pausa todos los procesos que escriban
en PostgreSQL o en el almacenamiento, incluidos los que esten fuera de Compose.

```bash
set -e
umask 077
backup=/ruta/cifrada/copia-nueva
photos=repository_storage_data
mkdir "$backup"
docker compose stop web
trap 'docker compose start web' EXIT
docker compose exec -T postgres sh -ec \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' \
  > "$backup/fotografia.dump"
docker run --rm --network none \
  --mount "type=volume,source=$photos,target=/photos,readonly" \
  --mount "type=bind,source=$backup,target=/backup" \
  postgres:16-alpine tar -C /photos -czf /backup/photos.tar.gz .
(cd "$backup" && sha256sum fotografia.dump photos.tar.gz > SHA256SUMS)
```

Conserva ambos archivos y su manifiesto juntos, en almacenamiento privado y
cifrado, con una copia separada del servidor de origen. Anota la fecha y el
commit de la aplicacion. Conserva las claves y configuraciones operativas en
el gestor de secretos, separado de la copia. Define la frecuencia y retencion
segun el volumen de cambios y los requisitos del despliegue.

## Restauracion de prueba

Usa un proyecto Compose nuevo, una base vacia y un volumen de fotos nuevo.
Mantén la web detenida hasta que terminen las dos restauraciones. Usa la
misma version principal de PostgreSQL y la imagen de la aplicacion asociada
a la copia.

```bash
set -e
backup=/ruta/cifrada/copia-verificada
target=fotografia-restauracion
(cd "$backup" && sha256sum -c SHA256SUMS)
docker compose -p "$target" up -d --wait postgres
docker compose -p "$target" exec -T postgres sh -ec \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --exit-on-error --single-transaction' \
  < "$backup/fotografia.dump"
docker run --rm --network none \
  --mount "type=volume,source=${target}_storage_data,target=/photos" \
  --mount "type=bind,source=$backup,target=/backup,readonly" \
  postgres:16-alpine tar -C /photos -xzf /backup/photos.tar.gz
```

En el destino aislado, comprueba que las referencias a archivos resuelvan,
que se conserve el estado de la papelera y que coincidan las sumas de los
originales y las miniaturas muestreados. Antes de poner en servicio un
destino restaurado, elimina todas sus filas de `AuthSession` y provisiona
la configuracion y claves de ese entorno.

## Almacenamiento S3 compatible

Con S3, sustituye el archivo de fotos por una copia privada y cifrada de los
objetos y sus claves, tomada durante la misma pausa de escrituras. Restaura
primero a un bucket separado, verifica los objetos y conecta solo el entorno
de prueba. El simulacro local cubre PostgreSQL y volumen Docker. La copia y
restauracion del bucket remoto requieren una prueba propia.
