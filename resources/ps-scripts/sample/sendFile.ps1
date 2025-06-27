param (
  [System.Management.Automation.Runspaces.PSSession] $Session,
  [String] $SourcePath,
  [String] $DestPath
)

Copy-Item –Path $SourcePath –Destination $DestPath –ToSession $Session -Force -Recurse
