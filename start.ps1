# Start script for restaurant-waitlist-manager
# Starts backend on port 5173, waits for /health, then starts frontend on port 4827
# Tracks PIDs for cleanup

$ErrorActionPreference = "Stop"

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"
$backendPort = 5173
$frontendPort = 4827
$logFile = Join-Path $env:TEMP "restaurant-waitlist-manager-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

$backendPid = $null
$frontendPid = $null
$backendLog = Join-Path $env:TEMP "backend-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$frontendLog = Join-Path $env:TEMP "frontend-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

function Stop-Services {
    Write-Log "Stopping services..."
    if ($frontendPid) {
        try {
            Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
            Write-Log "Frontend (PID $frontendPid) stopped"
        } catch {
            Write-Log "Frontend stop failed: $_"
        }
    }
    if ($backendPid) {
        try {
            Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
            Write-Log "Backend (PID $backendPid) stopped"
        } catch {
            Write-Log "Backend stop failed: $_"
        }
    }
}

trap {
    Write-Log "Error: $_"
    Stop-Services
    exit 1
}

Write-Log "Starting restaurant waitlist manager"
Write-Log "Log file: $logFile"

# Start backend
Write-Log "Starting backend on port $backendPort..."
$backendProcess = Start-Process -FilePath "uv" -ArgumentList "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", $backendPort, "--reload" `
    -WorkingDirectory $backendDir `
    -PassThru `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $logFile `
    -NoNewWindow

$backendPid = $backendProcess.Id
Write-Log "Backend started (PID $backendPid)"

# Wait for backend to be ready
Write-Log "Waiting for backend /health endpoint..."
$maxRetries = 30
$retryCount = 0
$backendReady = $false

while ($retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$backendPort/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
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
    Write-Log "Backend did not start in time. Check log: $logFile"
    Stop-Services
    exit 1
}

# Start frontend
Write-Log "Starting frontend on port $frontendPort..."
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" `
    -WorkingDirectory $frontendDir `
    -PassThru `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $logFile `
    -NoNewWindow

$frontendPid = $frontendProcess.Id
Write-Log "Frontend started (PID $frontendPid)"

Write-Log ""
Write-Log "Services running:"
Write-Log "  Backend:  http://localhost:$backendPort"
Write-Log "  Frontend: http://localhost:$frontendPort"
Write-Log "  Health:   http://localhost:$backendPort/health"
Write-Log "  Log:      $backendLog, $frontendLog"
Write-Log ""
Write-Log "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
try {
    while ($true) { Start-Sleep -Seconds 1 }
} catch {
    # Ignore
}
