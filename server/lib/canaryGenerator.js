/**
 * Ransomware Canary Script Generator
 * Generates a unique PowerShell (Windows) or Bash (Mac/Linux) script
 * per user with their webhook URL baked in.
 * 
 * The script:
 * 1. Creates decoy "canary" files in common folders
 * 2. Watches them for modification (ransomware encrypts everything)
 * 3. Webhooks CyberGuard immediately if any canary is touched
 * 4. No installer, no agent, no code signing needed
 */

export function generatePowerShellCanary({ webhookUrl, orgName, domainId }) {
  const canaryId = `cg-canary-${Date.now()}`
  return `# CyberGuard Ransomware Canary — ${orgName}
# Run this once as Administrator. It stays running in the background.
# If ransomware touches the canary files, CyberGuard alerts you immediately.
# Generated: ${new Date().toISOString()}

$WebhookUrl = "${webhookUrl}"
$CanaryId   = "${canaryId}"
$OrgName    = "${orgName}"

# Create canary files in common target folders
$CanaryFolders = @(
  [Environment]::GetFolderPath("Desktop"),
  [Environment]::GetFolderPath("MyDocuments"),
  [Environment]::GetFolderPath("MyPictures"),
  "$env:USERPROFILE\\Downloads"
)

$CanaryName = "!IMPORTANT-DO-NOT-DELETE-cyberguard-canary.txt"
$CanaryContent = "CyberGuard security canary file. Do not delete. ID: $CanaryId"

foreach ($folder in $CanaryFolders) {
  if (Test-Path $folder) {
    $path = Join-Path $folder $CanaryName
    Set-Content -Path $path -Value $CanaryContent -Force
    Write-Host "[CyberGuard] Canary placed: $path"
  }
}

Write-Host "[CyberGuard] Canary files deployed. Watching for threats..."

# Set up file system watchers on each folder
$Watchers = @()
foreach ($folder in $CanaryFolders) {
  if (Test-Path $folder) {
    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path   = $folder
    $watcher.Filter = $CanaryName
    $watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName
    $watcher.EnableRaisingEvents = $true
    $Watchers += $watcher
  }
}

# Alert function
function Send-Alert {
  param($EventType, $FilePath)
  Write-Host "[CyberGuard] ALERT: Canary $EventType detected at $FilePath"
  $body = @{
    canaryId  = $CanaryId
    orgName   = $OrgName
    event     = $EventType
    filePath  = $FilePath
    hostname  = $env:COMPUTERNAME
    username  = $env:USERNAME
    timestamp = (Get-Date -Format "o")
  } | ConvertTo-Json
  
  try {
    Invoke-RestMethod -Uri $WebhookUrl -Method Post \`
      -ContentType "application/json" -Body $body -TimeoutSec 10
  } catch {
    Write-Host "[CyberGuard] Warning: Could not reach webhook: $_"
  }
}

# Register event handlers
foreach ($watcher in $Watchers) {
  Register-ObjectEvent $watcher "Changed" -Action { 
    Send-Alert "modified" $Event.SourceEventArgs.FullPath 
  } | Out-Null
  Register-ObjectEvent $watcher "Deleted" -Action { 
    Send-Alert "deleted" $Event.SourceEventArgs.FullPath 
  } | Out-Null
  Register-ObjectEvent $watcher "Renamed" -Action { 
    Send-Alert "renamed" $Event.SourceEventArgs.FullPath 
  } | Out-Null
}

# Self-install as a scheduled task so it survives terminal close and reboots
$TaskName = "CyberGuard-Canary"
$ScriptDir = "$env:APPDATA\CyberGuard"
$ScriptPath = "$ScriptDir\canary.ps1"

New-Item -ItemType Directory -Force -Path $ScriptDir | Out-Null
Copy-Item -Path $PSCommandPath -Destination $ScriptPath -Force

$Action   = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File `"$ScriptPath`""
$Trigger  = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0

try {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force | Out-Null
  Write-Host "[CyberGuard] Installed as background task '$TaskName' — close this window safely"
  Write-Host "[CyberGuard] Auto-starts at every login"
  Write-Host "[CyberGuard] To uninstall: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
} catch {
  Write-Host "[CyberGuard] Note: run as Administrator for persistent install. Running in foreground for now."
}

Write-Host "[CyberGuard] Canary monitoring active."
while ($true) { Start-Sleep -Seconds 30 }
`
}

export function generateBashCanary({ webhookUrl, orgName, domainId }) {
  const canaryId = `cg-canary-${Date.now()}`
  return `#!/bin/bash
# CyberGuard Ransomware Canary — ${orgName}
# Run once: bash canary.sh
# Watches for ransomware encrypting your canary files.
# Generated: ${new Date().toISOString()}

WEBHOOK_URL="${webhookUrl}"
CANARY_ID="${canaryId}"
ORG_NAME="${orgName}"
CANARY_NAME="!IMPORTANT-DO-NOT-DELETE-cyberguard-canary.txt"
CANARY_CONTENT="CyberGuard security canary. Do not delete. ID: ${canaryId}"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  PLATFORM="macOS"
  CANARY_DIRS=(
    "$HOME/Desktop"
    "$HOME/Documents"
    "$HOME/Downloads"
    "$HOME/Pictures"
  )
else
  PLATFORM="Linux"
  CANARY_DIRS=(
    "$HOME/Desktop"
    "$HOME/Documents"
    "$HOME/Downloads"
  )
fi

# Create canary files
for dir in "\${CANARY_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "$CANARY_CONTENT" > "$dir/$CANARY_NAME"
    echo "[CyberGuard] Canary placed: $dir/$CANARY_NAME"
  fi
done

echo "[CyberGuard] Canary files deployed. Watching for threats..."

# Alert function
send_alert() {
  local event_type="$1"
  local file_path="$2"
  echo "[CyberGuard] ALERT: Canary $event_type at $file_path"
  curl -s -X POST "$WEBHOOK_URL" \\
    -H "Content-Type: application/json" \\
    -d "{
      \\"canaryId\\": \\"$CANARY_ID\\",
      \\"orgName\\": \\"$ORG_NAME\\",
      \\"event\\": \\"$event_type\\",
      \\"filePath\\": \\"$file_path\\",
      \\"hostname\\": \\"$(hostname)\\",
      \\"username\\": \\"$(whoami)\\",
      \\"platform\\": \\"$PLATFORM\\",
      \\"timestamp\\": \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"
    }" &
}

# Watch using fswatch (macOS built-in) or inotifywait (Linux)
if [[ "$PLATFORM" == "macOS" ]]; then
  if ! command -v fswatch &> /dev/null; then
    echo "[CyberGuard] Installing fswatch (required for macOS monitoring)..."
    brew install fswatch 2>/dev/null || {
      echo "[CyberGuard] Please install fswatch: brew install fswatch"
      exit 1
    }
  fi
  
  WATCH_PATHS=()
  for dir in "\${CANARY_DIRS[@]}"; do
    [ -d "$dir" ] && WATCH_PATHS+=("$dir/$CANARY_NAME")
  done
  
  # Install as LaunchAgent for persistence (survives terminal close + reboots)
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST_FILE="$PLIST_DIR/app.cyberguard.canary.plist"
  SCRIPT_DEST="$HOME/.cyberguard-canary.sh"
  
  mkdir -p "$PLIST_DIR"
  cp "$0" "$SCRIPT_DEST"
  chmod +x "$SCRIPT_DEST"
  
  cat > "$PLIST_FILE" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>app.cyberguard.canary</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$SCRIPT_DEST</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/cyberguard-canary.log</string>
  <key>StandardErrorPath</key><string>/tmp/cyberguard-canary.log</string>
</dict>
</plist>
PLIST
  
  launchctl unload "$PLIST_FILE" 2>/dev/null
  launchctl load "$PLIST_FILE"
  echo "[CyberGuard] ✓ Installed as background service (LaunchAgent)"
  echo "[CyberGuard] ✓ Runs automatically at login — close this terminal safely"
  echo "[CyberGuard] ✓ To uninstall: launchctl unload $PLIST_FILE && rm $PLIST_FILE"
  echo "[CyberGuard] Log: tail -f /tmp/cyberguard-canary.log"

  echo "[CyberGuard] Monitoring active (macOS/fswatch). Press Ctrl+C to stop."
  fswatch -0 "\${WATCH_PATHS[@]}" | while IFS= read -r -d "" file; do
    if [ -f "$file" ]; then
      send_alert "modified" "$file"
    else
      send_alert "deleted" "$file"
    fi
  done
  
else
  if ! command -v inotifywait &> /dev/null; then
    echo "[CyberGuard] Installing inotify-tools..."
    sudo apt-get install -y inotify-tools 2>/dev/null
  fi
  
  WATCH_PATHS=()
  for dir in "\${CANARY_DIRS[@]}"; do
    [ -d "$dir" ] && WATCH_PATHS+=("$dir")
  done
  
  echo "[CyberGuard] Monitoring active (Linux/inotify). Press Ctrl+C to stop."
  inotifywait -m -r -e modify,delete,move "\${WATCH_PATHS[@]}" --format '%w%f %e' 2>/dev/null | \\
  while read file event; do
    if [[ "$file" == *"$CANARY_NAME"* ]]; then
      send_alert "$(echo $event | tr '[:upper:]' '[:lower:]')" "$file"
    fi
  done
fi
`
}
