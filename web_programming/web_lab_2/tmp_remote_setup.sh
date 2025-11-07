#!/usr/bin/env bash
set -euo pipefail
WILDFLY_VERSION="30.0.1.Final"
ARCHIVE="wildfly-${WILDFLY_VERSION}"
INSTALL_DIR="$HOME"
if [ ! -d "$INSTALL_DIR/$ARCHIVE" ]; then
  TMP_DIR=$(mktemp -d)
  ARCHIVE_PATH="$TMP_DIR/${ARCHIVE}.tar.gz"
  wget -q -O "$ARCHIVE_PATH" "https://github.com/wildfly/wildfly/releases/download/${WILDFLY_VERSION}/${ARCHIVE}.tar.gz"
  tar -xzf "$ARCHIVE_PATH" -C "$INSTALL_DIR"
  rm -rf "$TMP_DIR"
fi
ln -sfn "$INSTALL_DIR/$ARCHIVE" "$INSTALL_DIR/wildfly"
mkdir -p "$INSTALL_DIR/wildfly/standalone/deployments"
pkill -f wildfly || true
pkill -f jboss-modules || true
rm -f "$INSTALL_DIR/wildfly/standalone/deployments/"*.{failed,isdeploying,deployed} 2>/dev/null || true
