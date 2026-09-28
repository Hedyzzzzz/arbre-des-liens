param([string]$Root)
$ErrorActionPreference = 'Stop'
$tokenFile = Join-Path $env:USERPROFILE '.arbre-supabase-token'
$url = ((Get-Content (Join-Path $Root '.env.local')) | Where-Object { $_ -like 'VITE_SUPABASE_URL=*' }) -replace '^VITE_SUPABASE_URL=', ''
$ref = ([uri]$url.Trim()).Host.Split('.')[0]
$token = ''
if (Test-Path $tokenFile) { $token = (Get-Content $tokenFile -Raw).Trim() }
if (-not $token) {
  Write-Host ''
  Write-Host 'UNE SEULE FOIS : un jeton Supabase permet de configurer la base automatiquement.'
  Write-Host '1) La page Supabase va s ouvrir : clique sur Generate new token, donne un nom, copie le jeton (sbp_...).'
  Start-Process 'https://supabase.com/dashboard/account/tokens'
  $token = (Read-Host '2) Colle le jeton ici puis Entree (Entree seul pour passer cette etape)').Trim()
  if (-not $token) { Write-Host 'Etape ignoree.'; exit 0 }
}
$sql = Get-Content (Join-Path $Root 'supabase\setup.sql') -Raw -Encoding UTF8
$body = [System.Text.Encoding]::UTF8.GetBytes((@{ query = $sql } | ConvertTo-Json))
try {
  Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json; charset=utf-8' -Body $body | Out-Null
  Set-Content -Path $tokenFile -Value $token
  Write-Host 'Base Supabase a jour.'
} catch {
  Write-Host ('Impossible de configurer Supabase : ' + $_.Exception.Message)
  Remove-Item $tokenFile -ErrorAction SilentlyContinue
}
