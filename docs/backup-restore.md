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

## Retencion local

Ejecuta la retencion en un directorio privado y dedicado a un solo
despliegue. El comando conserva, como minimo, las N copias verificadas mas
recientes y todas las copias verificadas dentro de la ventana indicada.
Ordena por la fecha UTC del nombre y lee ambos archivos para comprobar sus
sumas. Conserva las copias incompletas o corruptas para revision. Revisa
la salida antes de aplicar y evita ejecutar dos procesos de retencion
sobre el mismo directorio a la vez. Requiere Python 3.11 o posterior.

Ejemplo de vista previa con cinco copias como minimo y una ventana de 30 dias:

```bash
python3 scripts/backup-retention.py /ruta/cifrada/copias --keep 5 --days 30
```

Agrega `--apply` solo cuando hayas revisado la lista. Los valores del ejemplo
son ilustrativos. El comando no programa ejecuciones ni aplica una politica
al almacenamiento S3.

### Prueba de integracion S3 local

El test comprueba el proveedor y el ZIP contra un servidor S3 compatible.
Usa un bucket temporal, credenciales ficticias y un puerto de loopback.
El procedimiento de copia y restauracion remota se valida por separado.

```powershell
$name = 'fotografia-s3-qa'
$secret = 'fotografia-qa-local-only'
$image = 'chrislusf/seaweedfs@sha256:ccad23e18639c8b98cee17e7100b95830a06077b56d8e5b006d6dcf8ec5e94a0'
docker run -d --rm --name $name -p 127.0.0.1::8333 -e AWS_ACCESS_KEY_ID=fotografia-qa -e "AWS_SECRET_ACCESS_KEY=$secret" -e S3_BUCKET=fotografia-qa $image mini -dir=/data
if ($LASTEXITCODE -ne 0) { throw 'Could not start S3 test container' }
try {
  $endpoint = 'http://' + (docker port $name 8333/tcp)
  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    curl.exe -s -o NUL $endpoint
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (!$ready) { throw 'S3 test container did not become ready' }
  # The test is intended for a new PowerShell session with no production credentials.
  $env:ALLOW_LOCAL_S3_TEST = '1'
  $env:S3_ENDPOINT = $endpoint
  $env:S3_BUCKET = 'fotografia-qa'
  $env:S3_REGION = 'us-east-1'
  $env:S3_ACCESS_KEY = 'fotografia-qa'
  $env:S3_SECRET_KEY = $secret
  $env:S3_FORCE_PATH_STYLE = 'true'
  npx.cmd tsx --test tests/s3-storage.integration.test.ts
  if ($LASTEXITCODE -ne 0) { throw 'S3 integration test failed' }
} finally {
  docker stop $name
  Remove-Item Env:ALLOW_LOCAL_S3_TEST,Env:S3_ENDPOINT,Env:S3_BUCKET,Env:S3_REGION,Env:S3_ACCESS_KEY,Env:S3_SECRET_KEY,Env:S3_FORCE_PATH_STYLE -ErrorAction SilentlyContinue
}
```

Para incluir el simulacro de restauracion, inicia un segundo contenedor con
las mismas opciones y credenciales ficticias, pero con otro nombre, por
ejemplo `fotografia-s3-restore-qa`. Cuando este listo, define
`S3_RESTORE_ENDPOINT` con su URL de loopback antes de ejecutar los tests.
Deten ambos contenedores y elimina la variable al terminar. El test guarda
un original y una miniatura ficticios en un directorio temporal, comprueba
que ya no existan en el origen y los recupera en el destino usando sus claves
originales. Este simulacro cubre dos objetos y no enumera un bucket completo.

### Simulacro de bucket completo

Desde PowerShell, ejecuta `./tests/s3-bucket-restore.ps1`. El simulacro usa
imágenes fijadas por su digest, una red interna de Docker, dos servidores
SeaweedFS y un volumen intermedio que se retira al finalizar. Los tres objetos
ficticios incluyen originales, una miniatura y un nombre con espacios.

El origen se detiene antes de restaurar. Se comparan las claves del destino
con el inventario esperado y se verifica el contenido descargado con
`rclone check --download` antes y después de restaurar.

El alcance son las claves y los bytes de los objetos vigentes. Las versiones
históricas, políticas de acceso, cifrado del proveedor y restauración de
PostgreSQL en el mismo punto de corte deben verificarse por separado con el
proveedor de producción.

### Simulacro conjunto de PostgreSQL y S3

El mismo comando ejecuta también las migraciones SQL del repositorio en un
PostgreSQL de origen y crea un cliente, un proyecto y dos fotos ficticias.
Las escrituras de prueba terminan antes del volcado y de la copia del bucket.
Después de detener ambos orígenes, el simulacro restaura PostgreSQL en una
base vacía y verifica que las claves referenciadas coincidan con el inventario
S3 restaurado, que se conserve la relación con el cliente y que solo la foto
esperada siga en la papelera.

La prueba se ejecuta con PostgreSQL 16 y SeaweedFS aislados. Aún queda por
verificar el punto de corte, las credenciales y las políticas con los servicios
reales de producción.
