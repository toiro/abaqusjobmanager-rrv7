param(
  [parameter(mandatory=$true)][string]$jobName,
  [parameter(mandatory=$true)][string]$workingDir,
  [parameter(mandatory=$true)][string]$inputFile,
  [parameter(ValueFromRemainingArguments=$true)]$args
)

$input = "${workingDir}\${inputFile}"
Push-Location $workingDir
# interactive で実行すると log ファイルが生成されないため、生成する
abaqus interactive "job=${jobName}" "input=${input}" @args | Tee-Object -FilePath "${jobName}.log"
Pop-Location
