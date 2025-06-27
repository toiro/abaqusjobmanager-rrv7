# refarence: https://learn.microsoft.com/ja-jp/powershell/scripting/security/remoting/ssh-remoting-in-powershell?view=powershell-7.5
param(
  [parameter(mandatory=$true)][string]$Hostname,
  [parameter(mandatory=$true)][string]$UserName,
  [parameter(mandatory=$true)][string]$ScriptPath,
  [parameter(ValueFromRemainingArguments=$true)]$args
)
$PSStyle.OutputRendering = 'PlainText'
$ErrorView = 'NormalView'
$ErrorActionPreference = 'Stop'

function Test-FirstParamIsPSSession {
    param (
        [Parameter(Mandatory)][ScriptBlock] $ScriptBlock
    )

    # param ブロック取得
    $paramBlock = $ScriptBlock.Ast.ParamBlock

    if (-not $paramBlock -or -not $paramBlock.Parameters -or $paramBlock.Parameters.Count -eq 0) {
        return $false  # param が存在しない、または引数なし
    }

    $firstParam = $paramBlock.Parameters[0]
    $typeName = $firstParam.StaticType?.FullName ?? $firstParam.StaticType?.ToString()

    # PSSession 型かをチェック
    return $typeName -eq 'System.Management.Automation.Runspaces.PSSession' 
}

try {
  $rawScript = Get-Content $ScriptPath -Raw
  $sb = [scriptblock]::Create($rawScript)


  $session = New-PSSession -HostName $Hostname -UserName $UserName

  if (Test-FirstParamIsPSSession($sb)) {
    $argsWithSession = @($session) + $args
    Invoke-Command -ScriptBlock $sb -ArgumentList $argsWithSession
  } else {
    Invoke-Command -ScriptBlock $sb -Session $session -ArgumentList $args
  }
}
catch {
  Write-Error $_

  exit 1
}
finally {
  if (-not $session -eq $null) {
    Remove-PSSession -Session $session
  }
}
