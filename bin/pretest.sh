#!/bin/bash

MONERO_VERSION="v0.14.0.2-unlocked-1conf"
WALLET_NAME="mainnet"
VENDOR="vendor"
VENDOR_BIN="$VENDOR/bin"

unameOut="$(uname -s)"
case "${unameOut}" in
  Linux*)     MACHINE=linux;;
  Darwin*)    MACHINE=mac;;
  CYGWIN*)    MACHINE=cygwin;;
  MINGW*)     MACHINE=mingw;;
  *)          MACHINE="UNKNOWN:${unameOut}"
esac

ARCHIVE_NAME="monero-$MACHINE-x64-$MONERO_VERSION"
ARCHIVE_DIR="$VENDOR/$ARCHIVE_NAME"
ARCHIVE_FILE="$VENDOR/$ARCHIVE_NAME.tar.bz2"

WALLET_PASSWORD_FILE="test/wallet/${WALLET_NAME}.wallet.password"
if [ ! -e "$WALLET_PASSWORD_FILE" ]; then
  echo "Missing file ${WALLET_PASSWORD_FILE} -- ask Dylan to share it with you"
  exit 1
fi

if [ ! -e "$VENDOR_BIN/monero-wallet-rpc" ] \
  || ! cmp -s "$VENDOR_BIN/monero-wallet-rpc" "$ARCHIVE_DIR/monero-wallet-rpc" >/dev/null 2>&1
then
  mkdir -p "$VENDOR_BIN"

  if [ ! -e "$ARCHIVE_DIR" ]; then
    if [ ! -e $ARCHIVE_FILE ]; then
      if [ $MACHINE == 'linux' ] || [ $MACHINE == 'mac' ]; then
        DL_URL="https://dlsrc.getmonero.org/cli/$ARCHIVE_NAME.tar.bz2"
      else
        echo "Retrieving monero binaries only supported on Mac and Linux not ${MACHINE}. Manually download to vendor/bin to run tests"
        exit 1
      fi
      wget -O "$ARCHIVE_FILE" "$DL_URL"
    fi
    mkdir -p "$ARCHIVE_DIR"
    tar -xjvf "$ARCHIVE_FILE" -C "$ARCHIVE_DIR" --strip-components=2
  fi

  cp $ARCHIVE_DIR/* "$VENDOR_BIN"
fi

