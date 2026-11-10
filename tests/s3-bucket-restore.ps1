$ErrorActionPreference = 'Stop'
$suffix = [guid]::NewGuid().ToString('N').Substring(0, 12)
$network = "fotografia-s3-$suffix"
$volume = "fotografia-copy-$suffix"
$source = "fotografia-source-$suffix"
$target = "fotografia-target-$suffix"
$sourceDb = "fotografia-db-source-$suffix"
$targetDb = "fotografia-db-target-$suffix"
$seaweed = 'chrislusf/seaweedfs@sha256:ccad23e18639c8b98cee17e7100b95830a06077b56d8e5b006d6dcf8ec5e94a0'
$rclone = 'rclone/rclone@sha256:7cbeec24a44f206067597c0368be4de90ae19a64d5113c7d1938bd737a81e466'
$secret = 'fotografia-qa-local-only'
$bucket = 'fotografia-qa'
$started = @()

function Invoke-Docker {
    docker @args
    if ($LASTEXITCODE -ne 0) { throw "Docker exited with code $LASTEXITCODE." }
}

$config = @()
foreach ($remote in @('SOURCE', 'TARGET')) {
    $hostName = if ($remote -eq 'SOURCE') { $source } else { $target }
    $prefix = "RCLONE_CONFIG_${remote}"
    $config += @(
        '-e', "${prefix}_TYPE=s3",
        '-e', "${prefix}_PROVIDER=Other",
        '-e', "${prefix}_ENDPOINT=http://${hostName}:8333",
        '-e', "${prefix}_ACCESS_KEY_ID=fotografia-qa",
        '-e', "${prefix}_SECRET_ACCESS_KEY=$secret",
        '-e', "${prefix}_REGION=us-east-1",
        '-e', "${prefix}_FORCE_PATH_STYLE=true"
    )
}

function Invoke-Rclone {
    Invoke-Docker run --rm --network $network --mount "type=volume,source=$volume,target=/backup" @config $rclone @args
}

try {
    Invoke-Docker network create --internal $network | Out-Null
    Invoke-Docker volume create $volume | Out-Null
    foreach ($name in @($source, $target)) {
        Invoke-Docker run -d --rm --name $name --network $network -e AWS_ACCESS_KEY_ID=fotografia-qa -e "AWS_SECRET_ACCESS_KEY=$secret" -e "S3_BUCKET=$bucket" $seaweed mini -dir=/data | Out-Null
        $started += $name
    }
    foreach ($remote in @('source', 'target')) {
        $ready = $false
        for ($attempt = 0; $attempt -lt 15; $attempt++) {
            docker run --rm --network $network @config $rclone lsf "${remote}:$bucket" --retries 1 --contimeout 2s --timeout 3s 2>$null
            if ($LASTEXITCODE -eq 0) { $ready = $true; break }
            Start-Sleep -Seconds 1
        }
        if (!$ready) { throw "$remote S3 bucket did not become ready." }
    }

    Invoke-Docker run --rm --network $network @config --entrypoint sh $rclone -ec '
        mkdir -p /tmp/fixture/originals /tmp/fixture/thumbs
        printf original > /tmp/fixture/originals/first.jpg
        printf "another original" > "/tmp/fixture/originals/second photo.jpg"
        printf thumbnail > /tmp/fixture/thumbs/first.webp
        rclone copy /tmp/fixture source:fotografia-qa
    '
    foreach ($name in @($sourceDb, $targetDb)) {
        Invoke-Docker run -d --rm --name $name --network $network -e POSTGRES_PASSWORD=$secret -e POSTGRES_DB=fotografia --mount "type=volume,source=$volume,target=/snapshot" postgres:16-alpine | Out-Null
        $started += $name
        $ready = $false
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            docker exec $name pg_isready -h 127.0.0.1 -U postgres -d fotografia | Out-Null
            if ($LASTEXITCODE -eq 0) { $ready = $true; break }
            Start-Sleep -Seconds 1
        }
        if (!$ready) { throw "$name did not become ready." }
    }

    $migrations = Join-Path $PSScriptRoot '../prisma/migrations'
    foreach ($migration in Get-ChildItem $migrations -Directory | Sort-Object Name) {
        Get-Content -Raw (Join-Path $migration.FullName 'migration.sql') | docker exec -i $sourceDb psql -X -v ON_ERROR_STOP=1 -U postgres -d fotografia | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Fixture migration failed.' }
    }
    @"
INSERT INTO "User" ("id","email","passwordHash","name","role","updatedAt")
VALUES ('fixture-user','backup@example.invalid','fixture-only','Fixture','CLIENT',now());
INSERT INTO "ClientProfile" ("id","userId","updatedAt") VALUES ('fixture-client','fixture-user',now());
INSERT INTO "Project" ("id","clientId","title","status","updatedAt")
VALUES ('fixture-project','fixture-client','Fixture','DELIVERED',now());
INSERT INTO "Photo" ("id","projectId","storageKey","thumbKey","filename","trashedAt") VALUES
('first','fixture-project','originals/first.jpg','thumbs/first.webp','first.jpg',now()),
('second','fixture-project','originals/second photo.jpg',NULL,'second photo.jpg',NULL);
"@ | docker exec -i $sourceDb psql -X -v ON_ERROR_STOP=1 -U postgres -d fotografia | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not seed PostgreSQL fixtures." }

    # All fixture writers have finished before either snapshot is taken.
    Invoke-Docker exec $sourceDb pg_dump -U postgres -d fotografia -Fc --no-owner --no-acl -f /snapshot/fotografia.dump
    Invoke-Rclone copy "source:$bucket" /backup/objects
    Invoke-Rclone check "source:$bucket" /backup/objects --download
    Invoke-Docker stop $source $sourceDb | Out-Null
    $started = @($target, $targetDb)

    Invoke-Docker exec $targetDb pg_restore -U postgres -d fotografia --no-owner --no-acl --exit-on-error --single-transaction /snapshot/fotografia.dump
    Invoke-Rclone copy /backup/objects "target:$bucket"
    Invoke-Rclone check /backup/objects "target:$bucket" --download
    $restoredKeys = @(Invoke-Rclone lsf "target:$bucket" --recursive --files-only)
    $expectedKeys = @('originals/first.jpg', 'originals/second photo.jpg', 'thumbs/first.webp')
    if (Compare-Object $expectedKeys $restoredKeys) { throw 'Restored object keys did not match.' }
    $sql = @"
SELECT json_agg(row_to_json(restored) ORDER BY restored.id)
FROM (
    SELECT photo.id, photo."storageKey", photo."thumbKey",
           photo."trashedAt" IS NOT NULL AS trashed, account.email
    FROM "Photo" photo
    JOIN "Project" project ON project.id = photo."projectId"
    JOIN "ClientProfile" client ON client.id = project."clientId"
    JOIN "User" account ON account.id = client."userId"
) restored;
"@
    $json = $sql | docker exec -i $targetDb psql -X -v ON_ERROR_STOP=1 -U postgres -d fotografia -At
    if ($LASTEXITCODE -ne 0) { throw "Could not query the restored database." }
    $rows = $json | ConvertFrom-Json
    if ($rows.Count -ne 2 -or $rows[0].id -ne 'first' -or !$rows[0].trashed -or
        $rows[1].id -ne 'second' -or $rows[1].trashed -or
        @($rows | Where-Object email -ne 'backup@example.invalid').Count -ne 0) {
        throw 'Restored client relationships or trash state did not match.'
    }
    $referencedKeys = @($rows | ForEach-Object { $_.storageKey; if ($_.thumbKey) { $_.thumbKey } })
    if (Compare-Object $restoredKeys $referencedKeys) { throw 'Database references did not match restored objects.' }
    Write-Output 'PASS PostgreSQL relationships, trash state, and all three S3 objects restored with both sources stopped'
} finally {
    foreach ($name in $started) { docker stop $name | Out-Null }
    docker volume rm $volume | Out-Null
    docker network rm $network | Out-Null
}
