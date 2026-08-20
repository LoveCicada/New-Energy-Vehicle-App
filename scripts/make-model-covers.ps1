# One-shot generator for local model cover placeholders (750x420 PNG).
Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot '..\miniprogram\assets\models' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $dir) {
  $dir = Join-Path (Split-Path $PSScriptRoot -Parent) 'miniprogram\assets\models'
}
New-Item -ItemType Directory -Force -Path $dir | Out-Null

function Get-DarkerColor([System.Drawing.Color]$c, [double]$factor = 0.72) {
  [System.Drawing.Color]::FromArgb(
    $c.A,
    [int]($c.R * $factor),
    [int]($c.G * $factor),
    [int]($c.B * $factor)
  )
}

function Save-Cover([string]$file, [string]$hex, [string]$label) {
  $width = 750
  $height = 420
  $bmp = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $base = [System.Drawing.ColorTranslator]::FromHtml($hex)
  $dark = Get-DarkerColor $base
  $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $base, $dark, ([System.Drawing.Drawing2D.LinearGradientMode]::Horizontal)
  $g.FillRectangle($grad, $rect)
  $grad.Dispose()

  $font = New-Object System.Drawing.Font 'Segoe UI', 36, ([System.Drawing.FontStyle]::Bold)
  $brush = [System.Drawing.Brushes]::White
  $sz = $g.MeasureString($label, $font)
  $g.DrawString($label, $font, $brush, ($width - $sz.Width) / 2, ($height - $sz.Height) / 2)

  $outPath = Join-Path $dir $file
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose()
  $font.Dispose()
  $bmp.Dispose()
  Write-Host "Wrote $outPath"
}

$covers = @(
  @{ file = 'han.png';       hex = '#1a2744'; label = 'HAN' },
  @{ file = 'xia.png';       hex = '#1a2744'; label = 'XIA' },
  @{ file = 'd9.png';        hex = '#3a2a18'; label = 'D9' },
  @{ file = 'u8.png';        hex = '#222222'; label = 'U8' },
  @{ file = 'leopard5.png';  hex = '#3d2a12'; label = 'BAO5' },
  @{ file = 'galaxy.png';    hex = '#0b3d2e'; label = 'GALAXY' },
  @{ file = 'lynkco08.png';  hex = '#333333'; label = '08' },
  @{ file = 'zeekr007.png';  hex = '#1a1a1a'; label = '007' },
  @{ file = 'm9.png';        hex = '#0b6e4f'; label = 'M9' },
  @{ file = 'r7.png';        hex = '#1e4d6b'; label = 'R7' },
  @{ file = 's9.png';        hex = '#2c2c3a'; label = 'S9' },
  @{ file = 's800.png';       hex = '#1a1520'; label = 'S800' },
  @{ file = 'h5.png';        hex = '#2a4038'; label = 'H5' },
  @{ file = 'su7.png';       hex = '#4a4a4a'; label = 'SU7' },
  @{ file = 'yu7.png';       hex = '#4a4a4a'; label = 'YU7' }
)

foreach ($c in $covers) {
  Save-Cover -file $c.file -hex $c.hex -label $c.label
}

Write-Host "`nDone. Files:"
Get-ChildItem $dir -Filter '*.png' | Sort-Object Name | ForEach-Object {
  Write-Host ("  {0,-16} {1,8:N0} bytes" -f $_.Name, $_.Length)
}
$sum = (Get-ChildItem $dir -Filter '*.png' | Measure-Object Length -Sum).Sum
Write-Host ("Total: {0:N0} bytes ({1:F2} KB)" -f $sum, ($sum / 1KB))
