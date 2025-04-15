#!/bin/sh
# 開発用自己署名証明書を backend ディレクトリに生成するシェルスクリプト
# OpenSSL がインストールされている必要があります

CRT_PATH="../../server.crt"
KEY_PATH="../../server.key"

if [ -f "$CRT_PATH" ] || [ -f "$KEY_PATH" ]; then
  printf "%s or %s already exists. Overwrite? [Y/n]: " "$CRT_PATH" "$KEY_PATH"
  read OVERWRITE
  if [ "$OVERWRITE" != "Y" ] && [ "$OVERWRITE" != "y" ]; then
    echo "Skipped generating certificate and key."
    exit 0
  fi
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "$KEY_PATH" -out "$CRT_PATH" -subj "/C=JP/ST=Dev/L=Dev/O=Dev/OU=Dev/CN=localhost"
if [ $? -ne 0 ]; then
  echo "Failed to generate certificate."
  exit 1
else
  echo "Certificate and key generated."
fi
