param(
  [string]$ProjectRoot = "C:\Work\train-arrival-notifier",
  [string]$AndroidSdkPath = "$env:LOCALAPPDATA\Android\Sdk",
  [string]$JdkPath = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot",
  [switch]$SkipNpmInstall,
  [switch]$SkipPrebuild
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Add-PathIfMissing {
  param([string]$TargetPath)

  if (-not (Test-Path $TargetPath)) {
    throw "パスが見つかりません: $TargetPath"
  }

  $pathItems = ($env:Path -split ";") | Where-Object { $_ -ne "" }
  if ($pathItems -notcontains $TargetPath) {
    $env:Path += ";$TargetPath"
  }
}

function Set-UserEnvironmentVariable {
  param(
    [string]$Name,
    [string]$Value
  )

  [System.Environment]::SetEnvironmentVariable($Name, $Value, "User")
}

Write-Step "Windows Android 開発環境の前提を確認"

if (-not (Test-Path $ProjectRoot)) {
  throw "プロジェクトルートが見つかりません: $ProjectRoot"
}

if (-not (Test-Path $AndroidSdkPath)) {
  throw "Android SDK が見つかりません: $AndroidSdkPath"
}

if (-not (Test-Path $JdkPath)) {
  throw "JDK が見つかりません: $JdkPath"
}

$adbPath = Join-Path $AndroidSdkPath "platform-tools"
if (-not (Test-Path (Join-Path $adbPath "adb.exe"))) {
  throw "adb.exe が見つかりません: $adbPath"
}

Write-Step "環境変数を設定"

$env:JAVA_HOME = $JdkPath
$env:ANDROID_HOME = $AndroidSdkPath
$env:ANDROID_SDK_ROOT = $AndroidSdkPath

Add-PathIfMissing -TargetPath (Join-Path $JdkPath "bin")
Add-PathIfMissing -TargetPath $adbPath

Set-UserEnvironmentVariable -Name "JAVA_HOME" -Value $JdkPath
Set-UserEnvironmentVariable -Name "ANDROID_HOME" -Value $AndroidSdkPath
Set-UserEnvironmentVariable -Name "ANDROID_SDK_ROOT" -Value $AndroidSdkPath

$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$newUserPathItems = @()
if ($userPath) {
  $newUserPathItems += ($userPath -split ";")
}

foreach ($requiredPath in @((Join-Path $JdkPath "bin"), $adbPath)) {
  if ($newUserPathItems -notcontains $requiredPath) {
    $newUserPathItems += $requiredPath
  }
}

Set-UserEnvironmentVariable -Name "Path" -Value (($newUserPathItems | Where-Object { $_ -ne "" }) -join ";")

Write-Step "ツールのバージョンを確認"
git --version
node -v
npm -v
java -version
adb version

Set-Location $ProjectRoot

if (-not $SkipNpmInstall) {
  Write-Step "npm install を実行"
  npm install
}

if (-not $SkipPrebuild) {
  Write-Step "Expo prebuild を実行"
  npx expo prebuild
}

Write-Step "Android local.properties を生成"

$androidDir = Join-Path $ProjectRoot "android"
if (-not (Test-Path $androidDir)) {
  throw "android ディレクトリが見つかりません: $androidDir"
}

$normalizedSdkPath = $AndroidSdkPath -replace "\\", "/"
$localPropertiesPath = Join-Path $androidDir "local.properties"
Set-Content -Path $localPropertiesPath -Value "sdk.dir=$normalizedSdkPath"

Write-Step "Gradle wrapper を Expo/Android ビルド向けに補正"

$gradleWrapperPath = Join-Path $androidDir "gradle\wrapper\gradle-wrapper.properties"
if (-not (Test-Path $gradleWrapperPath)) {
  throw "Gradle wrapper 設定が見つかりません: $gradleWrapperPath"
}

$gradleWrapperContent = Get-Content $gradleWrapperPath -Raw
$updatedGradleWrapperContent = $gradleWrapperContent -replace "gradle-[0-9.]+-bin\.zip", "gradle-8.13-bin.zip"
Set-Content -Path $gradleWrapperPath -Value $updatedGradleWrapperContent

Write-Step "ADB 接続状況を確認"
adb devices

Write-Step "セットアップ完了"
Write-Host "次のコマンドで Android ビルドを開始できます。" -ForegroundColor Green
Write-Host "cd `"$ProjectRoot`"" -ForegroundColor Green
Write-Host "npx expo run:android" -ForegroundColor Green
