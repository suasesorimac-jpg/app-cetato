@echo off
rem ══════════════════════════════════════════════════════════════
rem  APPCETATO · Reset del repo GitHub + push desde cero
rem  Doble clic en este archivo (requiere Node.js y Git en el PATH)
rem ══════════════════════════════════════════════════════════════
cd /d "%~dp0"
node scripts\push-fresh.mjs
echo.
echo ──────────────────────────────────────────────────────────────
echo  Presiona cualquier tecla para cerrar esta ventana...
pause >nul
