# Copia y restauracion de Fotografia Site

Cada copia debe reunir PostgreSQL y el almacenamiento de fotos del mismo punto
de corte. El volcado incluye cuentas, proyectos, auditoria y estado de la
papelera. El almacenamiento incluye originales y miniaturas, tambien de las
fotos en papelera.

## Copia con almacenamiento local

Ejecuta el comando desde el directorio de Compose, con el proyecto de origen
seleccionado. Usa Bash con las utilidades GNU y un directorio existente,
privado y cifrado. Coordina una ventana de mantenimiento y pausa cualquier
escritor externo a Compose. El comando requiere que la web esté encendida,
la detiene durante la copia y la vuelve a iniciar.

```bash
bash scripts/backup-local.sh /ruta/cifrada/copias
```

El comando imprime la ruta de la copia después de validar ambos archivos y
generar el manifiesto. Un fallo devuelve un código distinto de cero y elimina
los archivos parciales. Si el proceso termina abruptamente y deja el bloqueo
`.fotografia-backup.lock`, verifica primero que no quede ninguna copia activa y
comprueba el estado de la web antes de retirar el bloqueo.

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
