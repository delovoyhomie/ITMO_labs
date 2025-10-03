#!/usr/bin/env bash
set -euo pipefail

ISO_USER="s409946"
PORT=2222

REMOTE_ROOT="/home/studs/${ISO_USER}"
HTTPD_ROOT="${REMOTE_ROOT}/httpd-root"
WWW_ROOT="${REMOTE_ROOT}/.www"

ssh -p ${PORT} ${ISO_USER}@helios.cs.ifmo.ru "mkdir -p ${HTTPD_ROOT}/{conf,fcgi-bin,mutex-dir} ${WWW_ROOT}"

scp -P ${PORT} build/libs/app.jar ${ISO_USER}@helios.cs.ifmo.ru:${HTTPD_ROOT}/fcgi-bin/app.jar
rsync -av -e "ssh -p ${PORT}" static/ ${ISO_USER}@helios.cs.ifmo.ru:${WWW_ROOT}/

scp -P ${PORT} guide/httpd-helios.conf ${ISO_USER}@helios.cs.ifmo.ru:${HTTPD_ROOT}/conf/httpd.conf
