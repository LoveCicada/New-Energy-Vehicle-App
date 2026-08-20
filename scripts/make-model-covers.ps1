# One-shot generator for local model cover placeholders (500x280 JPEG, ~50 quality).
# Keep total miniprogram image payload under WeChat's 200KB audit.
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

function Get-JpegEncoder {
  $codecs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()
  foreach ($codec in $codecs) {
    if ($codec.MimeType -eq 'image/jpeg') { return $codec }
  }
  throw 'JPEG encoder not found'
}

function Save-Cover([string]$file, [string]$hex, [string]$label) {
  $width = 500
  $height = 280
  $bmp = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $base = [System.Drawing.ColorTranslator]::FromHtml($hex)
  $dark = Get-DarkerColor $base
  $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $base, $dark, ([System.Drawing.Drawing2D.LinearGradientMode]::Horizontal)
  $g.FillRectangle($grad, $rect)
  $grad.Dispose()

  $font = New-Object System.Drawing.Font 'Segoe UI', 28, ([System.Drawing.FontStyle]::Bold)
  $brush = [System.Drawing.Brushes]::White
  $sz = $g.MeasureString($label, $font)
  $g.DrawString($label, $font, $brush, ($width - $sz.Width) / 2, ($height - $sz.Height) / 2)

  $outPath = Join-Path $dir $file
  $encoder = Get-JpegEncoder
  $quality = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]55)
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encoderParams.Param[0] = $quality
  $bmp.Save($outPath, $encoder, $encoderParams)
  $encoderParams.Dispose()
  $quality.Dispose()

  $g.Dispose()
  $font.Dispose()
  $bmp.Dispose()
  Write-Host "Wrote $outPath"
}

$covers = @(
  @{ file = 'han.jpg';       hex = '#1a2744'; label = 'HAN' },
  @{ file = 'xia.jpg';       hex = '#1a2744'; label = 'XIA' },
  @{ file = 'd9.jpg';        hex = '#3a2a18'; label = 'D9' },
  @{ file = 'u8.jpg';        hex = '#222222'; label = 'U8' },
  @{ file = 'leopard5.jpg';  hex = '#3d2a12'; label = 'BAO5' },
  @{ file = 'galaxy.jpg';    hex = '#0b3d2e'; label = 'GALAXY' },
  @{ file = 'lynkco08.jpg';  hex = '#333333'; label = '08' },
  @{ file = 'zeekr007.jpg';  hex = '#1a1a1a'; label = '007' },
  @{ file = 'm9.jpg';        hex = '#0b6e4f'; label = 'M9' },
  @{ file = 'r7.jpg';        hex = '#1e4d6b'; label = 'R7' },
  @{ file = 's9.jpg';        hex = '#2c2c3a'; label = 'S9' },
  @{ file = 's800.jpg';      hex = '#1a1520'; label = 'S800' },
  @{ file = 'h5.jpg';        hex = '#2a4038'; label = 'H5' },
  @{ file = 'su7.jpg';       hex = '#4a4a4a'; label = 'SU7' },
  @{ file = 'yu7.jpg';       hex = '#4a4a4a'; label = 'YU7' }
)

foreach ($c in $covers) {
  Save-Cover -file $c.file -hex $c.hex -label $c.label
}

Get-ChildItem $dir -Filter '*.png' -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Host "`nDone. Files:"
Get-ChildItem $dir -Filter '*.jpg' | Sort-Object Name | ForEach-Object {
  Write-Host ("  {0,-16} {1,8:N0} bytes" -f $_.Name, $_.Length)
}
$sum = (Get-ChildItem $dir -Filter '*.jpg' | Measure-Object Length -Sum).Sum
Write-Host ("Total: {0:N0} bytes ({1:F2} KB)" -f $sum, ($sum / 1KB))
