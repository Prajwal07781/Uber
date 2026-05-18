$ErrorActionPreference = "Stop"

$port = 8081
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if ($listener) {
    $processIds = $listener | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        Write-Host "Stopping existing process on port $port. PID: $processId"
        Stop-Process -Id $processId -Force
    }
    Start-Sleep -Seconds 2
}

Write-Host "Starting UberJavaFullStack on http://localhost:$port"
$jarPath = Join-Path $PSScriptRoot "target\uber-java-fullstack-0.0.1-SNAPSHOT.jar"

if (Test-Path $jarPath) {
    java -jar $jarPath
} else {
    $mavenFromWrapperCache = Get-ChildItem "$env:USERPROFILE\.m2\wrapper\dists" -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($mavenFromWrapperCache) {
        & $mavenFromWrapperCache.FullName spring-boot:run
    } else {
        cmd /c mvnw.cmd spring-boot:run
    }
}
