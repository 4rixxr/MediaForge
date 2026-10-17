$ErrorActionPreference='Stop'
$root=Resolve-Path (Join-Path $PSScriptRoot '..')
foreach($folder in @('scripts','desktop')) {
 foreach($file in Get-ChildItem (Join-Path $root $folder) -Filter '*.ps1') {
  $tokens=$null; $parseErrors=$null
  $null=[System.Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$parseErrors)
  if($parseErrors.Count -gt 0){throw ($file.Name+': '+($parseErrors.Message -join '; '))}
 }
}
Write-Host 'PASS: PowerShell script syntax. This does not execute optical operations.'
