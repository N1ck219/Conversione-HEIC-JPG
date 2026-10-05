@echo off
setlocal
title Convertitore HEIC - JPG
cd /d "%~dp0"

rem --- Trova Python (launcher "py" oppure "python")
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
    where python >nul 2>nul && set "PY=python"
)
if not defined PY (
    echo [ERRORE] Python non trovato.
    echo Installalo da https://www.python.org/downloads/ e spunta "Add python.exe to PATH".
    pause
    exit /b 1
)

rem --- Crea il venv se non esiste
if not exist ".venv\Scripts\python.exe" (
    echo Creo l'ambiente virtuale .venv ...
    %PY% -m venv .venv
    if errorlevel 1 (
        echo [ERRORE] Impossibile creare il venv.
        pause
        exit /b 1
    )
    rem venv nuovo: forza (re)installazione dei pacchetti
    if exist ".venv\.deps_ok" del ".venv\.deps_ok"
)

rem --- Installa le dipendenze (solo la prima volta)
if not exist ".venv\.deps_ok" (
    echo Installo le dipendenze, attendi...
    ".venv\Scripts\python.exe" -m pip install --upgrade pip
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERRORE] Installazione delle dipendenze fallita. Controlla la connessione a internet.
        pause
        exit /b 1
    )
    echo ok> ".venv\.deps_ok"
)

rem --- Avvia l'app (il browser si apre da solo)
echo.
echo Avvio il convertitore. Per chiudere: chiudi questa finestra o premi Ctrl+C.
".venv\Scripts\python.exe" app.py
if errorlevel 1 (
    echo.
    echo [ERRORE] L'app si e' chiusa con un errore.
    pause
)
endlocal
