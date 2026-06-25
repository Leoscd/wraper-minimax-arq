# Crea las 18 issues de GitHub via API REST
# Usa la variable de entorno GITHUB_TOKEN (configurar antes de correr):
#   $env:GITHUB_TOKEN = "ghp_xxx..."
#   powershell -File scripts/create-issues.ps1

$ErrorActionPreference = 'Continue'

if (-not $env:GITHUB_TOKEN) {
    Write-Host "ERROR: Setear la variable de entorno GITHUB_TOKEN antes de correr este script" -ForegroundColor Red
    Write-Host 'Ejemplo: $env:GITHUB_TOKEN = "ghp_xxx"; powershell -File scripts/create-issues.ps1'
    exit 1
}

$token = $env:GITHUB_TOKEN
$headers = @{
    "Authorization" = "Bearer $token"
    "User-Agent" = "opencode"
    "Accept" = "application/vnd.github+json"
    "Content-Type" = "application/json"
}

$issuesJson = Get-Content -Path "$PSScriptRoot\issues.json" -Raw -Encoding UTF8
$issues = $issuesJson | ConvertFrom-Json

$okCount = 0
$failCount = 0

foreach ($issue in $issues) {
    $payload = @{
        title = $issue.title
        body  = $issue.body
    } | ConvertTo-Json -Depth 5

    try {
        $r = Invoke-RestMethod -Uri "https://api.github.com/repos/Leoscd/wraper-minimax-arq/issues" -Headers $headers -Method Post -Body $payload
        Write-Host ("OK  #{0}: {1}" -f $r.number, $issue.title)
        $okCount++
    } catch {
        Write-Host ("FAIL: {0} - {1}" -f $issue.title, $_.Exception.Message)
        $failCount++
    }
    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host ("Total: {0} OK, {1} failed" -f $okCount, $failCount)
