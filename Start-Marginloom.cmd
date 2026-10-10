@echo off
cd /d "%~dp0"
if not exist "%~dp0Start-Marginloom.ps1" (
  echo Marginloom cannot find its startup files.
  echo If you opened this inside a ZIP, click Extract all first.
  echo Then run Start-Marginloom.cmd from the extracted folder.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Marginloom.ps1" %*
pause
