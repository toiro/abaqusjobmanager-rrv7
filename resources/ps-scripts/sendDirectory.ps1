param (
  [parameter(mandatory=$true)][System.Management.Automation.Runspaces.PSSession]$Session,
  [parameter(mandatory=$true)][string]$Source,
  [parameter(mandatory=$true)][string]$Destination
)
Copy-Item –Path $Source –Destination $Destination –ToSession $Session -Force -Recurse
