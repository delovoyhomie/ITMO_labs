#!/usr/bin/env bash
set -euo pipefail

PASSWORD="MxAi*2657"
HOST="s409946@helios.cs.ifmo.ru"
PORT=2222
REMOTE_ROOT="/home/studs/s409946"
HTTPD_ROOT="$REMOTE_ROOT/httpd-root"
WWW_ROOT="$REMOTE_ROOT/.www"

run_expect() {
  local command="$1"
  expect <<EOD
set timeout -1
spawn bash -c "$command"
expect {
    -re "Are you sure you want to continue connecting" { send "yes\r"; exp_continue }
    -re "Password:" { send "$PASSWORD\r"; exp_continue }
    eof
}
EOD
}

docker run --rm -v "$PWD":/workspace -w /workspace gradle:8.10-jdk21 gradle clean jar

run_expect "rsync -av -e 'ssh -p $PORT' static/ $HOST:$WWW_ROOT/"
run_expect "scp -P $PORT build/libs/app.jar $HOST:$HTTPD_ROOT/fcgi-bin/app.jar"
run_expect "ssh -p $PORT $HOST '/usr/local/sbin/httpd -f $HTTPD_ROOT/conf/httpd.conf -k restart'"
run_expect "ssh -p $PORT $HOST 'pkill -f \'fcgi-bin/app.jar\' 2>/dev/null || true'"
run_expect "ssh -p $PORT $HOST 'nohup java -Xmx256m -DFCGI_PORT=11000 -jar $HTTPD_ROOT/fcgi-bin/app.jar > $HTTPD_ROOT/app.log 2>&1 &'"
