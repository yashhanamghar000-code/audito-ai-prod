# Creates the env\ folder from env.example\ for running AUDITO locally (Windows PowerShell).
# Usage:  powershell -ExecutionPolicy Bypass -File .\setup-env.ps1
$ErrorActionPreference = "Stop"
if (Test-Path "env") { Write-Host "env\ already exists - not touching it. Delete it first to regenerate."; exit 0 }

$key = Read-Host "Paste YOUR Anthropic API key (starts with sk-ant-)"
if ($key -notmatch '^sk-ant-') { Write-Host "That does not look like an Anthropic key (should start with sk-ant-)."; exit 1 }

# random JWT secret for this machine only
$bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$jwt = [Convert]::ToBase64String($bytes)

New-Item -ItemType Directory -Path "env" | Out-Null
Get-ChildItem "env.example\*.env.example" | ForEach-Object {
  $name = $_.Name -replace '\.example$', ''
  $text = (Get-Content $_.FullName -Raw) `
    -replace 'PASTE_YOUR_ANTHROPIC_KEY_HERE', $key `
    -replace 'JWT_SECRET_KEY=CHANGE_ME', "JWT_SECRET_KEY=$jwt"
  [IO.File]::WriteAllText((Join-Path "env" $name), $text, (New-Object Text.UTF8Encoding $false))
}
Write-Host "Done. env\ created. Next:  docker compose up --build -d   then open http://localhost:8000"
