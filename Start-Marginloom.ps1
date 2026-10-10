param([switch]$Development)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskRuntimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$taskBundledNode = Join-Path $taskRuntimeRoot 'node\bin\node.exe'
if (Test-Path -LiteralPath $taskBundledNode) {
    $env:PATH = (Split-Path -Parent $taskBundledNode) + ';' + $env:PATH
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Install Node.js LTS from https://nodejs.org, then reopen this launcher.' -ForegroundColor Yellow
    exit 1
}
$taskBundledPnpm = Join-Path $taskRuntimeRoot 'bin\fallback\pnpm.cmd'
if (Test-Path -LiteralPath $taskBundledPnpm) { $taskPackageManager = $taskBundledPnpm }
elseif (Get-Command pnpm.cmd -ErrorAction SilentlyContinue) { $taskPackageManager = (Get-Command pnpm.cmd).Source }
elseif (Get-Command npm.cmd -ErrorAction SilentlyContinue) { $taskPackageManager = (Get-Command npm.cmd).Source }
else { throw 'No package manager found. Install Node.js LTS, which includes npm.' }
if (-not (Test-Path -LiteralPath 'node_modules\vite') -or -not (Test-Path -LiteralPath 'node_modules\kokoro-js')) {
    Write-Host 'Installing Marginloom dependencies. Internet is needed for this first step.' -ForegroundColor Green
    & $taskPackageManager install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if ($Development) {
    Write-Host 'Opening development mode. Offline caching is available in production mode.' -ForegroundColor Green
    & node scripts/prepare-assets.mjs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 --strictPort --open
} else {
    $taskExistingMarginloom = $false
    try {
        $taskExistingPage = Invoke-WebRequest -Uri 'http://localhost:4173/' -UseBasicParsing -TimeoutSec 2
        $taskExistingMarginloom = $taskExistingPage.Content -match '<title>Marginloom</title>'
        if (-not $taskExistingMarginloom) { throw 'Another application is using port 4173. Close it, then reopen Marginloom.' }
    } catch {
        if ($_.Exception.Message -like '*Another application*') { throw }
    }
    Write-Host 'Building your offline study space...' -ForegroundColor Green
    & node scripts/prepare-assets.mjs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & node node_modules/vite/bin/vite.js build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    if ($taskExistingMarginloom) {
        Write-Host 'Marginloom is already running. Opening your updated study space.' -ForegroundColor Green
        Start-Process -FilePath 'http://localhost:4173/' -WindowStyle Hidden
        exit 0
    }
    Write-Host 'Keep this window open. Press Ctrl+C to stop Marginloom.' -ForegroundColor Green
    & node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 4173 --strictPort --open
}
