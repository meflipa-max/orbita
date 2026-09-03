# ORBITA - build
# Unisce src/shell.html + src/*.js in due output:
#   orbita.html      formato Artifact (senza doctype/head/body: li aggiunge la piattaforma)
#   dist/index.html  standalone, per browser locale / WebView Android / Capacitor
# NB: questo file resta in ASCII puro - PowerShell 5.1 legge gli .ps1 senza BOM come ANSI.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $root 'src'

$shell = Get-Content (Join-Path $src 'shell.html') -Raw -Encoding UTF8
$js = (Get-ChildItem (Join-Path $src '*.js') | Sort-Object Name |
       ForEach-Object { "/* ==== $($_.Name) ==== */`r`n" + (Get-Content $_.FullName -Raw -Encoding UTF8) }) -join "`r`n"

# sostituzione letterale: -replace tratterebbe $ e \ del JS come riferimenti regex
$page = $shell.Replace('/*__ORBITA_JS__*/', $js)

$artifact = Join-Path $root 'orbita.html'
Set-Content -Path $artifact -Value $page -Encoding UTF8 -NoNewline

$head = @"
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#070613">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="description" content="Orbita - bullet heaven roguelite in cui la tua build e' un anello di rune che ti gira intorno.">
</head>
<body>
"@
$standalone = $head + $page + "`r`n</body>`r`n</html>`r`n"

$dist = Join-Path $root 'dist'
if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }
Set-Content -Path (Join-Path $dist 'index.html') -Value $standalone -Encoding UTF8 -NoNewline

$kb = [math]::Round((Get-Item $artifact).Length / 1KB, 1)
Write-Output ("build ok - orbita.html + dist/index.html - " + $kb + " KB")
