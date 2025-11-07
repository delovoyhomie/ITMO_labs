#!/usr/bin/env bash
set -euo pipefail

PASSWORD="MxAi*2657"
HOST="s409946@helios.cs.ifmo.ru"
PORT=2222
APP_NAME="lab2"
WAR_NAME="Labwork2-1.0-SNAPSHOT.war"
REMOTE_WAR="~/${APP_NAME}.war"
WILDFLY_VERSION="30.0.1.Final"
PORT_OFFSET=5040 # 8080 + 5040 = 13120

# Prefer local Corretto 17 if JAVA_HOME is not set.
JAVA17_FALLBACK="/Users/slava/Library/Java/JavaVirtualMachines/corretto-17.0.9/Contents/Home"
if [ -z "${JAVA_HOME:-}" ] && [ -d "$JAVA17_FALLBACK" ]; then
  export JAVA_HOME="$JAVA17_FALLBACK"
fi

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

echo "▶️  Building project (WAR)..."
./gradlew clean build

WAR_PATH="build/libs/${WAR_NAME}"
if [ ! -f "$WAR_PATH" ]; then
  echo "Не найден WAR $WAR_PATH" >&2
  exit 1
fi

echo "▶️  Uploading WAR to Helios..."
run_expect "scp -P $PORT '$WAR_PATH' $HOST:$REMOTE_WAR"

REMOTE_SCRIPT_LOCAL="$(mktemp)"
cat <<'EOF' > "$REMOTE_SCRIPT_LOCAL"
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="__APP_NAME__"
WILDFLY_VERSION="__WILDFLY_VERSION__"
PORT_OFFSET="__PORT_OFFSET__"

ARCHIVE="wildfly-${WILDFLY_VERSION}"
INSTALL_DIR="$HOME"
WILDFLY_HOME="$INSTALL_DIR/wildfly"
ARCHIVE_DIR="$INSTALL_DIR/$ARCHIVE"
WAR_SOURCE="$HOME/${APP_NAME}.war"
DEPLOY_NAME="${APP_NAME}.war"

if [ ! -d "$ARCHIVE_DIR" ]; then
  TMP_DIR=$(mktemp -d)
  ARCHIVE_PATH="$TMP_DIR/${ARCHIVE}.tar.gz"
  wget -q -O "$ARCHIVE_PATH" "https://github.com/wildfly/wildfly/releases/download/${WILDFLY_VERSION}/${ARCHIVE}.tar.gz"
  tar -xzf "$ARCHIVE_PATH" -C "$INSTALL_DIR"
  rm -rf "$TMP_DIR"
fi

ln -sfn "$ARCHIVE_DIR" "$WILDFLY_HOME"
mkdir -p "$WILDFLY_HOME/standalone/deployments" "$WILDFLY_HOME/standalone/log"

if [ ! -f "$WAR_SOURCE" ]; then
  echo "WAR $WAR_SOURCE не найден" >&2
  exit 1
fi

cp "$WAR_SOURCE" "$WILDFLY_HOME/standalone/deployments/${DEPLOY_NAME}"
rm -f "$WILDFLY_HOME/standalone/deployments/${DEPLOY_NAME}".{failed,deployed,isdeploying} 2>/dev/null || true

pkill -f 'wildfly' || true
pkill -f 'jboss-modules' || true

nohup env JAVA_HOME=/usr/local/openjdk17 PATH=/usr/local/openjdk17/bin:$PATH \
  JAVA_OPTS='-Xms128m -Xmx256m' \
  "$WILDFLY_HOME/bin/standalone.sh" -b 0.0.0.0 -bmanagement 0.0.0.0 \
  -Djboss.socket.binding.port-offset=${PORT_OFFSET} \
  > "$WILDFLY_HOME/standalone/log/server.out" 2>&1 &

echo "WildFly restarted. HTTP порт: $((8080 + PORT_OFFSET))."
EOF

perl -pi -e "s/__APP_NAME__/$APP_NAME/g" "$REMOTE_SCRIPT_LOCAL"
perl -pi -e "s/__WILDFLY_VERSION__/$WILDFLY_VERSION/g" "$REMOTE_SCRIPT_LOCAL"
perl -pi -e "s/__PORT_OFFSET__/$PORT_OFFSET/g" "$REMOTE_SCRIPT_LOCAL"

REMOTE_TMP="/tmp/wildfly-deploy-$RANDOM.sh"
run_expect "scp -P $PORT '$REMOTE_SCRIPT_LOCAL' $HOST:$REMOTE_TMP"
rm "$REMOTE_SCRIPT_LOCAL"

echo "▶️  Applying remote configuration..."
run_expect "ssh -p $PORT $HOST 'bash $REMOTE_TMP && rm -f $REMOTE_TMP'"

echo "✅ Готово. Приложение должно быть доступно на http://localhost:$((8080 + PORT_OFFSET)) (через туннель ssh -L)."
