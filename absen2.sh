#!/bin/bash

# Simpan file cookie sementara
COOKIE_FILE=$(mktemp)

# Login
curl 'https://absenpkl.stmbksimo.com/sw-proses?action=login' \
  -X POST \
  -H 'X-Requested-With: XMLHttpRequest' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36' \
  -H 'Referer: https://absenpkl.stmbksimo.com/' \
  -F 'email=13648@gmail.com' \
  -F 'password=13648' \
  -c "$COOKIE_FILE" > login_response2.txt

# Cek apakah login berhasil
if grep -iq "success" login_response.txt; then
  echo "Login berhasil, lanjut absen..."

  # Absen
  curl 'https://absenpkl.stmbksimo.com/sw-proses?action=absent' \
    -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
    -H 'Accept: */*' \
    -H 'X-Requested-With: XMLHttpRequest' \
    -H 'User-Agent: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36' \
    -H 'Referer: https://absenpkl.stmbksimo.com/absent' \
    --data-raw 'qrcode=2025/C709/SW2025-02-25&latitude=-7.530607277797366,110.58327667415142&radius=2' \
    -b "$COOKIE_FILE"

else
  echo "Login gagal. Cek username/password atau script."
  cat login_response2.txt
fi

# Bersihkan file cookie
rm "$COOKIE_FILE"
