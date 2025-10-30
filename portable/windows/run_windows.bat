@echo off
setlocal

rem Caminhos fundamentais
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PORTABLE_DIR=%%~fI"
for %%I in ("%PORTABLE_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "PY_HOME=%PORTABLE_DIR%\windows\python"
set "PYTHONW_EXE=%PY_HOME%\pythonw.exe"

if not exist "%PYTHONW_EXE%" (
  msg * "Python portátil não encontrado. Copie novamente a pasta portable/windows/python."
  goto :EOF
)

rem confirmar se bibliotecas essenciais estão presentes (teste com Flask)
"%PYTHONW_EXE%" "%PORTABLE_DIR%\windows\verify_env.pyw"
if errorlevel 1 goto :EOF

rem Inicia o launcher (sem console)
start "" "%PYTHONW_EXE%" "%PORTABLE_DIR%\launch.py"

endlocal
