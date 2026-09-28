@echo off
cd /d "%~dp0"
echo === Publication sur GitHub ===
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo Git n'est pas installe. Installez-le ici : https://git-scm.com/download/win
  echo Puis relancez ce fichier.
  pause
  exit /b 1
)

if not exist ".git" (
  git init
  git branch -M main
)

git config user.email >nul 2>nul
if not errorlevel 1 goto identity_ok
echo Git ne connait pas encore votre identite.
set /p GITNAME=Votre pseudo GitHub : 
set /p GITMAIL=Votre email GitHub : 
git config user.name "%GITNAME%"
git config user.email "%GITMAIL%"
:identity_ok

git add .
git diff --cached --quiet
if errorlevel 1 git commit -m "Mise a jour du site"

git remote get-url origin >nul 2>nul
if not errorlevel 1 goto push
echo.
echo Creez d'abord un depot VIDE sur https://github.com/new
echo (sans README, sans .gitignore, sans licence).
set /p REPO=Collez l'URL du depot (ex: https://github.com/pseudo/arbre.git) : 
if "%REPO%"=="" (
  echo Aucune URL saisie.
  pause
  exit /b 1
)
git remote add origin "%REPO%"

:push
git branch -M main
git push -u origin main
if errorlevel 1 (
  echo.
  echo Le push a echoue. Verifiez l'URL du depot et votre connexion GitHub.
  pause
  exit /b 1
)

echo.
echo Termine. Pour activer le site : sur GitHub, Settings ^> Pages ^> Source : GitHub Actions.
echo Le site sera ensuite en ligne apres 1 a 2 minutes.
pause
