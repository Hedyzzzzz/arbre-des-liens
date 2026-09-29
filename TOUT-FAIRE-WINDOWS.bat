@echo off
setlocal
cd /d "%~dp0"
title Publication automatique du site
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI"
set NAME=arbre-des-liens

echo.
echo ===== PUBLICATION AUTOMATIQUE DU SITE =====
echo.

if exist ".env.local" goto env_ok
echo [ERREUR] Le fichier .env.local est introuvable dans ce dossier.
goto fail
:env_ok

if exist "%USERPROFILE%\.arbre-serveur-v3" goto serveur_ok
echo.
echo ===== ETAPE UNIQUE : CONFIGURER LE SERVEUR =====
echo Le code a coller vient d'etre COPIE automatiquement.
echo Une page Supabase va s'ouvrir, puis :
echo    1) clique dans la grande zone de texte
echo    2) colle avec Ctrl+V
echo    3) clique sur le bouton vert RUN (en bas a droite)
echo    4) attends de voir Success, puis reviens ici
echo.
(type "supabase\setup.sql" & type "supabase\mot-de-passe.local") | clip
set REF=
for /f "tokens=2 delims=/" %%u in ('findstr /b "VITE_SUPABASE_URL" .env.local') do for /f "delims=." %%r in ("%%u") do set REF=%%r
start "" "https://supabase.com/dashboard/project/%REF%/sql/new"
pause
echo ok> "%USERPROFILE%\.arbre-serveur-v3"
:serveur_ok


rem --- 1. Installer Git et GitHub CLI si besoin
where git >nul 2>nul
if not errorlevel 1 goto git_ok
where winget >nul 2>nul
if errorlevel 1 goto need_manual
echo Installation de Git, patiente un peu...
winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements
where git >nul 2>nul
if errorlevel 1 goto need_manual
:git_ok

where gh >nul 2>nul
if not errorlevel 1 goto gh_ok
where winget >nul 2>nul
if errorlevel 1 goto need_manual
echo Installation de GitHub CLI, patiente un peu...
winget install --id GitHub.cli -e --source winget --silent --accept-package-agreements --accept-source-agreements
where gh >nul 2>nul
if errorlevel 1 goto need_manual
:gh_ok

rem --- 2. Connexion a GitHub (dans le navigateur)
:start
gh auth status >nul 2>nul
if not errorlevel 1 goto logged
echo.
echo === CONNEXION A GITHUB ===
echo Une page web va s'ouvrir. Connecte-toi avec TON compte GitHub,
echo puis recopie le code affiche ici (appuie sur Entree quand il le demande).
echo.
gh auth login --hostname github.com --git-protocol https --web --scopes workflow
if errorlevel 1 goto fail
goto after_login
:logged
gh auth status 2>&1 | findstr /c:"workflow" >nul
if errorlevel 1 gh auth refresh --hostname github.com --scopes workflow
:after_login
gh auth setup-git

set GHUSER=
for /f "delims=" %%i in ('gh api user --jq .login') do set GHUSER=%%i
if "%GHUSER%"=="" goto fail
echo.
echo Compte GitHub connecte : %GHUSER%
choice /c ON /n /m "Est-ce bien TON compte ? (O = oui, N = non) "
if errorlevel 2 goto relogin
set REPO=%GHUSER%/%NAME%

rem --- 3. Preparer le dossier
if not exist ".git" git init -q -b main
git config user.name >nul 2>nul || git config user.name "%GHUSER%"
git config user.email >nul 2>nul || git config user.email "%GHUSER%@users.noreply.github.com"
git add .
git commit -q -m "Mise a jour du site" >nul 2>nul
git branch -M main

rem --- 4. Creer le depot sur GitHub
git remote remove origin >nul 2>nul
gh repo view %REPO% >nul 2>nul
if not errorlevel 1 goto repo_exists
echo Creation du depot %REPO% ...
gh repo create %NAME% --public --source . --remote origin
if errorlevel 1 goto fail
goto vars
:repo_exists
git remote add origin https://github.com/%REPO%.git

rem --- 5. Envoyer les cles Supabase
:vars
echo Envoi des cles du site...
for /f "usebackq tokens=1,* delims==" %%a in (".env.local") do gh variable set %%a --body "%%b" --repo %REPO%

rem --- 6. Envoyer le code
echo Envoi du code sur GitHub...
git push -u origin main --force
if errorlevel 1 goto fail

rem --- 7. Activer le site et lancer sa construction
echo Activation du site...
gh api -X POST repos/%REPO%/pages -f build_type=workflow >nul 2>nul
if errorlevel 1 gh api -X PUT repos/%REPO%/pages -f build_type=workflow >nul 2>nul
timeout /t 5 /nobreak >nul
gh workflow run deploy.yml --repo %REPO% >nul 2>nul
timeout /t 8 /nobreak >nul
echo Construction du site en cours, environ 2 minutes...
set RUN=
for /f "delims=" %%i in ('gh run list --repo %REPO% --limit 1 --json databaseId --jq ".[0].databaseId"') do set RUN=%%i
if "%RUN%"=="" goto done
gh run watch %RUN% --repo %REPO% --exit-status >nul 2>nul
if errorlevel 1 goto build_failed

:done
set URL=https://%GHUSER%.github.io/%NAME%/
echo.
echo ===== TERMINE ! =====
echo Ton site : %URL%
echo Donne ce lien a tes amis, avec le mot de passe.
echo (En bas a droite de l accueil, la ligne "version du ..." doit etre celle d aujourd hui.)
start "" "%URL%?v=%RANDOM%"
pause
exit /b 0

:relogin
gh auth logout --hostname github.com
goto start

:need_manual
echo.
echo Impossible d'installer automatiquement Git ou GitHub CLI.
echo Installe-les puis relance ce fichier :
echo   https://git-scm.com/download/win
echo   https://cli.github.com
pause
exit /b 1

:build_failed
echo.
echo La construction du site a echoue. Ouvre cette page et envoie une capture a Claude :
echo   https://github.com/%REPO%/actions
pause
exit /b 1

:fail
echo.
echo Une etape a echoue. Recopie les dernieres lignes affichees ci-dessus a Claude.
pause
exit /b 1
