$ErrorActionPreference = "Stop"

$port = 8081
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if (-not $listener) {
    Write-Host "No application is running on port $port."
    exit 0
}

$processIds = $listener | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($processId in $processIds) {
    Write-Host "Stopping process on port $port. PID: $processId"
    Stop-Process -Id $processId -Force
}

Write-Host "Port $port is free."
