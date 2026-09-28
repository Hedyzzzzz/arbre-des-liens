@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Installez Node.js 24, puis relancez ce fichier.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Installation des dependances...
  call npm ci
  if errorlevel 1 (
    echo Installation impossible. Verifiez votre connexion et votre version de Node.js.
    pause
    exit /b 1
  )
)
echo Ouverture du site. Gardez cette fenetre ouverte.
call npm run dev -- --host localhost --port 5173 --strictPort --open
if errorlevel 1 (
  echo Si le port 5173 est occupe, fermez le terminal de l'ancienne version puis relancez.
  pause
)
