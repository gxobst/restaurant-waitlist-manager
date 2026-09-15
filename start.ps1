# Start script for restaurant-waitlist-manager
# Starts backend on port 5173, waits for /health, then starts frontend on port 4827

$ErrorActionPreference = "Stop"

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"
$backendPort = 5173
$frontendPort = 4827
$logFile = Join-Path $env:TEMP "restaurant-waitlist-manager-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Write-Log "Starting restaurant waitlist manager"
Write-Log "Log file: $logFile"

# Start backend
Write-Log "Starting backend on port $backendPort..."
$backendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c uv run uvicorn app.main:app --host 0.0.0.0 --port $backendPort --reload" `
    -WorkingDirectory $backendDir -PassThru
Write-Log "Backend started (PID $($_.Id))"

# Wait for backend to be ready
Write-Log "Waiting for backend /health endpoint..."
$maxRetries = 30
$retryCount = 0
$backendReady = $false

while ($retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 1
    try {
        $resp = curl -s -m 2 "http://localhost:$backendPort/health"
        if ($resp -match 'ok') {
            $backendReady = $true
            Write-Log "Backend is ready"
            break
        }
    } catch {
        $retryCount++
        if ($retryCount -ge $maxRetries) {
            Write-Log "Backend health check failed after $maxRetries attempts"
        }
    }
}

if (-not $backendReady) {
    Write-Log "Backend did not start in time"
    exit 1
}

# Start frontend
Write-Log "Starting frontend on port $frontendPort..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" `
    -WorkingDirectory $frontendDir -PassThru | Out-Null
Write-Log "Frontend started"

Write-Log ""
Write-Log "Services running:"
Write-Log "  Backend:  http://localhost:$backendPort"
Write-Log "  Frontend: http://localhost:$frontendPort"
Write-Log "  Health:   http://localhost:$backendPort/health"
Write-Log ""
Write-Log "Press Ctrl+C to stop"

# Wait for Ctrl+C
try {
    while ($true) { Start-Sleep -Seconds 1 }
} catch {
    # Ignore
}
