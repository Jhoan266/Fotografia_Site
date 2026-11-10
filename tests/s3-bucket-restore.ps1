$ErrorActionPreference = 'Stop'
$suffix = [guid]::NewGuid().ToString('N').Substring(0, 12)
$network = "fotografia-s3-$suffix"
$volume = "fotografia-copy-$suffix"
$source = "fotografia-source-$suffix"
$target = "fotografia-target-$suffix"
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
    Invoke-Rclone copy "source:$bucket" /backup
    Invoke-Rclone check "source:$bucket" /backup --download
    Invoke-Docker stop $source | Out-Null
    $started = @($target)

    Invoke-Rclone copy /backup "target:$bucket"
    Invoke-Rclone check /backup "target:$bucket" --download
    $restoredKeys = @(Invoke-Rclone lsf "target:$bucket" --recursive --files-only)
    $expectedKeys = @('originals/first.jpg', 'originals/second photo.jpg', 'thumbs/first.webp')
    if (Compare-Object $expectedKeys $restoredKeys) { throw 'Restored object keys did not match.' }
    Write-Output 'PASS restored all three keys and verified their contents with the origin stopped'
} finally {
    foreach ($name in $started) { docker stop $name | Out-Null }
    docker volume rm $volume | Out-Null
    docker network rm $network | Out-Null
}
