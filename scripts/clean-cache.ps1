# Clean Vite cache
Write-Host "Cleaning Vite cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Write-Host "Vite cache cleaned!" -ForegroundColor Green

