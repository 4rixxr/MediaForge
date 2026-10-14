# Compatible with Windows PowerShell 5.1 and PowerShell 7 used by Actions.
function Receive-BuildFile {
 param([Parameter(Mandatory=$true)][string]$Uri,[Parameter(Mandatory=$true)][string]$OutFile,[int]$MaximumRedirection=10)
 for($attempt=1;$attempt -le 3;$attempt++) {
  try {
   Invoke-WebRequest -Uri $Uri -OutFile $OutFile -MaximumRedirection $MaximumRedirection -UseBasicParsing -TimeoutSec 180 -ErrorAction Stop
   return
  } catch {
   if($attempt -eq 3){throw}
   Write-Warning "Download attempt $attempt failed; retrying in 5 seconds."
   Start-Sleep -Seconds 5
  }
 }
}
