# SellSnap — Ephemeral Cloudflare Tunnel Launcher
# Starts cloudflared, grabs the new trycloudflare.com URL, re-bakes
# NEXT_PUBLIC_APP_URL (.env.local) + allowedDevOrigins (next.config.ts),
# and restarts the dev server so the app is immediately payment-test ready.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/tunnel.ps1

$ErrorActionPreference = 'Stop'

$proj = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $proj '.env.local'
$configPath = Join-Path $proj 'next.config.ts'
$tunnelLog = Join-Path $proj 'cloudflared.log'
$devLog = Join-Path $proj 'dev-server.log'
$cfExe = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'

# Temp logs for cloudflared stdout/stderr (redirected; paths may contain spaces,
# which Live Start-Process handles because RedirectStandardOutput takes a raw path).
$cfOut = Join-Path $proj 'cloudflared.out.log'
$cfErr = Join-Path $proj 'cloudflared.err.log'

Write-Host '== Sell Snap: starting ephemeral tunnel =='

# 1. Stop any stale cloudflared / dev-server processes (ours only —
#    chrome-devtools-mcp and everything else is left untouched).
Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object {
    ($_.CommandLine -match 'sellsnap' -or
      ($_.CommandLine -match 'npm-cli\.js' -and $_.CommandLine -match 'run dev')) -and
      $_.CommandLine -notmatch 'chrome-devtools'
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

# 2. Record the outgoing (pre-swap) app URL for a friendly before/after.
$oldUrl = ''
if (Test-Path $envPath) {
  $match = [System.IO.File]::ReadAllText($envPath) -match 'NEXT_PUBLIC_APP_URL="?([^"\r\n]+)"?'
  if ($match) { $oldUrl = $Matches[1] }
}

# 3. Launch cloudflared in the background. stdout won't interleave with
#    twitter newline etc.; redirect stdout AND stderr to separate files so the
#    quick-tunnel URL can be scraped even if it lands on either stream.
if (-not (Test-Path $cfExe)) {
  throw "cloudflared not found at $cfExe"
}
Start-Process -FilePath $cfExe `
  -ArgumentList 'tunnel', '--url', 'http://localhost:3000' `
  -WindowStyle Hidden `
  -RedirectStandardOutput $cfOut `
  -RedirectStandardError $cfErr

# 4. Wait for the quick-tunnel URL.
function Get-TunnelUrl {
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 1
    foreach ($log in @($cfOut, $cfErr)) {
      if (Test-Path $log) {
        $line = Get-Content -Path $log -Raw -ErrorAction SilentlyContinue
        if ($line -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
          return $Matches[0]
        }
      }
    }
  }
  throw "Tunnel did not become ready within 90s. See $cfErr"
}
$url = Get-TunnelUrl
$tunnelHost = ([Uri]$url).Host
Write-Host "New tunnel: $url"

# 5. Re-bake .env.local  (NEXT_PUBLIC_APP_URL)
$envContent = [System.IO.File]::ReadAllText($envPath)
$envContent = [System.Text.RegularExpressions.Regex]::Replace(
  $envContent,
  '(?m)^NEXT_PUBLIC_APP_URL=.*$',
  "NEXT_PUBLIC_APP_URL=`"$url`"")
[System.IO.File]::WriteAllText($envPath, $envContent, (New-Object System.Text.UTF8Encoding(($false))))

# 6. Re-bake next.config.ts  (allowedDevOrigins entry + comment reference)
$configContent = [System.IO.File]::ReadAllText($configPath)
$configContent = [System.Text.RegularExpressions.Regex]::Replace(
  $configContent,
  "'[a-z0-9-]+\.trycloudflare\.com'",
  "'$tunnelHost'")
[System.IO.File]::WriteAllText($configPath, $configContent, (New-Object System.Text.UTF8Encoding(($false))))

# 7. Restart the dev server so it picks up the new env + allowed origin.
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev > dev-server.log 2>&1' -WorkingDirectory $proj -WindowStyle Hidden
Start-Sleep -Seconds 8

# 8. Verify end to end through the tunnel.
try {
  $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60
  Write-Host "Verified: $url -> HTTP $($resp.StatusCode)"
} catch {
  Write-Host "WARNING: tunnel up but verification failed: $($_.Exception.Message)"
}

Write-Host ''
Write-Host "Old URL : $oldUrl"
Write-Host "New URL : $url"
Write-Host 'Dev server restarted. Payment tests are ready to run.'