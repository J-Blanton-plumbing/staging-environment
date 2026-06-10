@echo off
echo Starting JBP preview...
start "Next.js Dev Server" cmd /k "cd /d C:\staging-environment && npm run dev"
timeout /t 5 /nobreak >nul
start "Cloudflare Tunnel" cmd /k "cloudflared tunnel --url http://localhost:3000"
echo.
echo Both windows are starting.
echo The public URL will appear in the Cloudflare Tunnel window (look for trycloudflare.com).
echo Username: jbp
echo Password: plumbing2026
pause
