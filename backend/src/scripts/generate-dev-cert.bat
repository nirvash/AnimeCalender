@echo off
chcp 65001
REM 開発用自己署名証明書を backend ディレクトリに生成するスクリプト
REM OpenSSL がインストールされている必要があります

set CRT_PATH=..\..\server.crt
set KEY_PATH=..\..\server.key

set OVERWRITE=Y
if exist %CRT_PATH% ( set OVERWRITE=ASK )
if exist %KEY_PATH% ( set OVERWRITE=ASK )

if "%OVERWRITE%"=="ASK" (
    set /p OVERWRITE=server.crt or server.key already exists. Overwrite? [Y/n]: 
    if /I not "%OVERWRITE%"=="Y" (
        echo Skipped generating certificate and key.
        goto :END
    )
)

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout %KEY_PATH% -out %CRT_PATH% -subj "/C=JP/ST=Dev/L=Dev/O=Dev/OU=Dev/CN=localhost"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to generate certificate.
    exit /b 1
) else (
    echo Certificate and key generated.
)

:END
