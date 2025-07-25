# Node Health Check Script
# Returns JSON with connection test results

$result = @{
    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    hostname = $env:COMPUTERNAME
    username = $env:USERNAME
    location = (Get-Location).Path
    tests = @{
        basicCommands = @{
            success = $true
            commands = @("whoami", "Get-Location")
        }
        environment = @{
            computername = $env:COMPUTERNAME
            username = $env:USERNAME
            powershell_version = $PSVersionTable.PSVersion.ToString()
            os_version = [System.Environment]::OSVersion.VersionString
        }
        abaqus = @{
            available = $false
            version = $null
            path = $null
            error = $null
        }
    }
    success = $true
    error = $null
}

try {
    # Test Abaqus availability
    $abaqusCommand = Get-Command abaqus -ErrorAction SilentlyContinue
    if ($abaqusCommand) {
        $result.tests.abaqus.available = $true
        $result.tests.abaqus.path = $abaqusCommand.Source
        
        try {
            # Get Abaqus version information
            $versionOutput = & abaqus information=version 2>$null
            if ($versionOutput) {
                $versionMatch = $versionOutput | Select-String "Abaqus\s+([0-9]+(?:\.[0-9]+)*)" 
                if ($versionMatch) {
                    $result.tests.abaqus.version = $versionMatch.Matches[0].Groups[1].Value
                }
            }
        } catch {
            $result.tests.abaqus.error = "Failed to get Abaqus version: $($_.Exception.Message)"
        }
    } else {
        $result.tests.abaqus.error = "Abaqus command not found in PATH"
    }
} catch {
    $result.tests.abaqus.error = "Error testing Abaqus: $($_.Exception.Message)"
    $result.success = $false
    $result.error = "Abaqus test failed: $($_.Exception.Message)"
}

# Output as JSON
$result | ConvertTo-Json -Depth 4 -Compress