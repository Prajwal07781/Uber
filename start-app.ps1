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
$jarPath = Join-Path $PSScriptRoot "backend\target\uber-java-fullstack-0.0.1-SNAPSHOT.jar"

function Start-WithMaven {
    $mavenFromWrapperCache = Get-ChildItem "$env:USERPROFILE\.m2\wrapper\dists" -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue |
        Select-Object -First 1

    Push-Location "$PSScriptRoot\backend"
    try {
        if ($mavenFromWrapperCache) {
            & $mavenFromWrapperCache.FullName spring-boot:run
        } else {
            cmd /c .\mvnw.cmd spring-boot:run
        }
    } finally {
        Pop-Location
    }
}

$bootableJar = $false
if (Test-Path $jarPath) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $jar = [System.IO.Compression.ZipFile]::OpenRead($jarPath)
    try {
        $manifest = $jar.GetEntry("META-INF/MANIFEST.MF")
        if ($manifest) {
            $reader = New-Object System.IO.StreamReader($manifest.Open())
            try {
                $bootableJar = $reader.ReadToEnd().Contains("org.springframework.boot.loader")
            } finally {
                $reader.Dispose()
            }
        }
    } finally {
        $jar.Dispose()
    }
}

if ($bootableJar) {
    Push-Location "$PSScriptRoot\backend"
    try {
        java -jar $jarPath
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Executable Spring Boot jar not found. Starting with Maven instead."
    Start-WithMaven
}
