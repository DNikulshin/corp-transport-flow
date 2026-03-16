<#
.SYNOPSIS
    Development environment manager: start/stop/restart Docker, backend and mobile.
.DESCRIPTION
    Provides a menu to control the development stack.
    Can restart individual components (backend or mobile) without touching Docker.
#>

$ErrorActionPreference = "Stop"

# --- Global variables to track running processes ---
$script:backendProcess = $null
$script:mobileProcess = $null
$script:dockerComposeCmd = $null

# --- Helper function to check if a command exists ---
function Test-Command($command) {
    return [bool](Get-Command $command -ErrorAction SilentlyContinue)
}

# --- Helper: find docker compose command ---
function Get-DockerComposeCommand {
    if (Test-Command "docker-compose") {
        return "docker-compose"
    } elseif (Test-Command "docker") {
        $test = docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
            return "docker compose"
        }
    }
    return $null
}

# --- Helper: kill process by object ---
function Stop-MyProcess($processObj, $processName) {
    if ($processObj -and $processObj.HasExited -eq $false) {
        try {
            Stop-Process -Id $processObj.Id -Force -ErrorAction Stop
            Write-Host "$processName stopped." -ForegroundColor Yellow
        } catch {
            Write-Host "Failed to stop $processName : $_" -ForegroundColor Red
        }
    }
}

# --- Helper: stop node processes related to a specific component or all ---
function Stop-NodeProcesses {
    param(
        [string]$Component  # "backend", "mobile", or empty for both
    )
    $backendPath = Join-Path $scriptRoot "backend"
    $mobilePath = Join-Path $scriptRoot "mobile"

    # Get all node processes
    $nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
    if (-not $nodeProcs) { return }

    $found = $false
    foreach ($proc in $nodeProcs) {
        $cmdLine = $proc.CommandLine
        $kill = $false
        if ($Component -eq "backend" -and $cmdLine -like "*$backendPath*") {
            $kill = $true
        } elseif ($Component -eq "mobile" -and $cmdLine -like "*$mobilePath*") {
            $kill = $true
        } elseif ([string]::IsNullOrEmpty($Component) -and ($cmdLine -like "*$backendPath*" -or $cmdLine -like "*$mobilePath*")) {
            $kill = $true
        }
        if ($kill) {
            try {
                Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
                Write-Host "Killed node process (PID $($proc.ProcessId))" -ForegroundColor Yellow
                $found = $true
            } catch {
                Write-Host "Failed to kill node process $($proc.ProcessId): $_" -ForegroundColor Red
            }
        }
    }
    if ($found) {
        Write-Host "Node processes cleaned up." -ForegroundColor Green
    }
}

# --- Helper: start backend ---
function Start-Backend {
    $backendPath = Join-Path $scriptRoot "backend"
    if (-not (Test-Path $backendPath)) {
        Write-Host "ERROR: backend folder not found at $backendPath" -ForegroundColor Red
        return $null
    }
    Write-Host "Starting backend (npm run dev)..." -ForegroundColor Green
    try {
        $proc = Start-Process powershell -ArgumentList "-NoExit", "cd '$backendPath'; npm run dev" -WindowStyle Normal -PassThru
        return $proc
    } catch {
        Write-Host "ERROR starting backend: $_" -ForegroundColor Red
        return $null
    }
}

# --- Helper: start mobile ---
function Start-Mobile {
    $mobilePath = Join-Path $scriptRoot "mobile"
    if (-not (Test-Path $mobilePath)) {
        Write-Host "ERROR: mobile folder not found at $mobilePath" -ForegroundColor Red
        return $null
    }
    Write-Host "Starting mobile (npm start)..." -ForegroundColor Green
    try {
        $proc = Start-Process powershell -ArgumentList "-NoExit", "cd '$mobilePath'; npm start" -WindowStyle Normal -PassThru
        return $proc
    } catch {
        Write-Host "ERROR starting mobile: $_" -ForegroundColor Red
        return $null
    }
}

# --- Helper: start Docker services ---
function Start-DockerServices {
    Write-Host "Starting Docker services..." -ForegroundColor Green
    try {
        Invoke-Expression "$script:dockerComposeCmd up -d"
        if ($LASTEXITCODE -ne 0) { throw "$script:dockerComposeCmd up -d failed with code $LASTEXITCODE" }
        return $true
    } catch {
        Write-Host "ERROR starting Docker: $_" -ForegroundColor Red
        return $false
    }
}

# --- Helper: wait for PostgreSQL readiness ---
function Wait-Postgres {
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    $ready = $false
    do {
        $attempt++
        & $script:dockerComposeCmd exec -T postgres pg_isready -U postgres > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 2
    } while ($attempt -lt $maxAttempts)

    if (-not $ready) {
        Write-Host "WARNING: Could not verify PostgreSQL readiness after $maxAttempts attempts. Continuing anyway..." -ForegroundColor Yellow
    } else {
        Write-Host "PostgreSQL is ready." -ForegroundColor Green
    }
}

# --- Helper: stop everything ---
function Stop-Environment {
    Write-Host "Stopping environment..." -ForegroundColor Cyan

    # Stop backend and mobile processes (PowerShell windows)
    Stop-MyProcess $script:backendProcess "Backend"
    Stop-MyProcess $script:mobileProcess "Mobile"

    # Stop Docker services
    if ($script:dockerComposeCmd) {
        Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
        try {
            Invoke-Expression "$script:dockerComposeCmd down"
            if ($LASTEXITCODE -ne 0) { throw "$script:dockerComposeCmd down failed with code $LASTEXITCODE" }
            Write-Host "Docker containers stopped." -ForegroundColor Green
        } catch {
            Write-Host "ERROR stopping Docker: $_" -ForegroundColor Red
        }
    }

    # Additional cleanup: kill any lingering node processes from backend/mobile
    Stop-NodeProcesses

    $script:backendProcess = $null
    $script:mobileProcess = $null
}

# --- Helper: stop only backend ---
function Stop-BackendOnly {
    Write-Host "Stopping backend only..." -ForegroundColor Cyan
    Stop-MyProcess $script:backendProcess "Backend"
    Stop-NodeProcesses -Component "backend"
    $script:backendProcess = $null
}

# --- Helper: stop only mobile ---
function Stop-MobileOnly {
    Write-Host "Stopping mobile only..." -ForegroundColor Cyan
    Stop-MyProcess $script:mobileProcess "Mobile"
    Stop-NodeProcesses -Component "mobile"
    $script:mobileProcess = $null
}

# --- Helper: start everything (with auto-stop if already running) ---
function Start-Environment {
    # Check prerequisites
    if (-not $script:dockerComposeCmd) {
        Write-Host "ERROR: Docker Compose not available." -ForegroundColor Red
        return
    }

    # If something is already running, stop it first (with confirmation)
    if ($script:backendProcess -or $script:mobileProcess) {
        Write-Host "Existing running processes detected." -ForegroundColor Yellow
        $confirm = Read-Host "Stop them and restart? (y/n)"
        if ($confirm -eq 'y') {
            Stop-Environment
            Start-Sleep -Seconds 2   # Give ports time to release
        } else {
            Write-Host "Start cancelled." -ForegroundColor Gray
            return
        }
    }

    # Start Docker
    if (-not (Start-DockerServices)) { return }

    # Check if postgres service exists and wait
    $services = & $script:dockerComposeCmd ps --services
    if ($services -contains "postgres") {
        Wait-Postgres
    } else {
        Write-Host "Service 'postgres' not found, skipping DB readiness check." -ForegroundColor Gray
    }

    # Start backend and mobile
    $script:backendProcess = Start-Backend
    $script:mobileProcess = Start-Mobile

    Write-Host "=== Environment started ===" -ForegroundColor Cyan
}

# --- Main menu loop ---
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

# Determine docker compose command
$script:dockerComposeCmd = Get-DockerComposeCommand
if (-not $script:dockerComposeCmd) {
    Write-Host "ERROR: Docker Compose (docker-compose or docker compose) not found." -ForegroundColor Red
    pause
    exit 1
}

# Check for compose file
if (-not (Test-Path "docker-compose.yml") -and -not (Test-Path "docker-compose.yaml")) {
    Write-Host "ERROR: docker-compose.yml not found in project root." -ForegroundColor Red
    pause
    exit 1
}

# Check npm availability (needed for backend/mobile)
if (-not (Test-Command "npm")) {
    Write-Host "ERROR: npm is not installed or not in PATH." -ForegroundColor Red
    pause
    exit 1
}

while ($true) {
    Clear-Host
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "   Development Environment Manager   " -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "1. Start environment (auto-stops if running)"
    Write-Host "2. Stop environment"
    Write-Host "3. Restart environment"
    Write-Host "4. Exit"
    Write-Host "5. Restart backend only"
    Write-Host "6. Restart mobile only"
    Write-Host ""
    $choice = Read-Host "Select option (1-6)"

    switch ($choice) {
        "1" {
            Start-Environment
            Write-Host ""
            Write-Host "Press any key to return to menu..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "2" {
            Stop-Environment
            Write-Host ""
            Write-Host "Press any key to return to menu..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "3" {
            Stop-Environment
            Start-Environment
            Write-Host ""
            Write-Host "Press any key to return to menu..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "4" {
            Write-Host "Exiting. Goodbye!" -ForegroundColor Cyan
            break
        }
        "5" {
            Write-Host "Restarting backend only..." -ForegroundColor Cyan
            Stop-BackendOnly
            Start-Sleep -Seconds 2
            $script:backendProcess = Start-Backend
            Write-Host "Backend restarted." -ForegroundColor Green
            Write-Host ""
            Write-Host "Press any key to return to menu..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "6" {
            Write-Host "Restarting mobile only..." -ForegroundColor Cyan
            Stop-MobileOnly
            Start-Sleep -Seconds 2
            $script:mobileProcess = Start-Mobile
            Write-Host "Mobile restarted." -ForegroundColor Green
            Write-Host ""
            Write-Host "Press any key to return to menu..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        default {
            Write-Host "Invalid choice. Press any key to continue..." -ForegroundColor Red
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
    }
}