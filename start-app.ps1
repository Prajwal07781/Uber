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
.\mvnw.cmd spring-boot:run
