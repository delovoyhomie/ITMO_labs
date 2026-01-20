#!/usr/bin/env bash
set -euo pipefail

PASSWORD="MxAi*2657"                    # пароль для ssh/scp (оставлен для справки)
HOST="s409946@helios.cs.ifmo.ru"        # логин@хост helios
PORT=2222                               # ssh порт
APP_NAME="lab3"                         # имя приложения/папки/джара на helios
APP_PORT=13120                          # порт Spring Boot
SSH_OPTS="-o PreferredAuthentications=keyboard-interactive,password -o KbdInteractiveAuthentication=yes -o PasswordAuthentication=yes -o PubkeyAuthentication=no -o ServerAliveInterval=30 -o ServerAliveCountMax=10 -o TCPKeepAlive=yes"
SCP_OPTS="-O"

# Prefer local Corretto 17 if JAVA_HOME is not set.
JAVA17_FALLBACK="/Users/slava/Library/Java/JavaVirtualMachines/corretto-17.0.9/Contents/Home"
if [ -z "${JAVA_HOME:-}" ] && [ -d "$JAVA17_FALLBACK" ]; then
  export JAVA_HOME="$JAVA17_FALLBACK"
fi

run_cmd() {
  local command="$1"
  bash -c "$command"
}

echo "▶️  Building project (bootJar)..."
./gradlew clean bootJar

JAR_PATH=$(ls -1 build/libs/*.jar | grep -v -- '-plain' | head -n 1)
if [ -z "${JAR_PATH:-}" ] || [ ! -f "$JAR_PATH" ]; then
  echo "Не найден JAR в build/libs" >&2
  exit 1
fi
LOCAL_SIZE=$(wc -c < "$JAR_PATH" | tr -d '[:space:]')
if command -v shasum >/dev/null 2>&1; then
  LOCAL_HASH=$(shasum -a 256 "$JAR_PATH" | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  LOCAL_HASH=$(sha256sum "$JAR_PATH" | awk '{print $1}')
else
  echo "Не найден инструмент для SHA-256 (shasum/sha256sum)" >&2
  exit 1
fi

echo "▶️  Uploading JAR to Helios..."
REMOTE_JAR="~/${APP_NAME}.jar"
run_cmd "scp $SCP_OPTS $SSH_OPTS -P $PORT '$JAR_PATH' $HOST:$REMOTE_JAR"

echo "▶️  Verifying upload..."
VERIFY_SCRIPT_LOCAL="$(mktemp)"
cat <<'VERIFY_EOF' > "$VERIFY_SCRIPT_LOCAL"
#!/usr/bin/env bash
set -euo pipefail

REMOTE_JAR="$HOME/__APP_NAME__.jar"
EXPECTED_SIZE="__EXPECTED_SIZE__"
EXPECTED_HASH="__EXPECTED_HASH__"

if [ ! -f "$REMOTE_JAR" ]; then
  echo "JAR $REMOTE_JAR не найден" >&2
  exit 1
fi

remote_size=$(wc -c < "$REMOTE_JAR" | tr -d '[:space:]')
if [ "$remote_size" != "$EXPECTED_SIZE" ]; then
  echo "Размер не совпадает: локально $EXPECTED_SIZE, удаленно $remote_size" >&2
  exit 1
fi

if command -v sha256 >/dev/null 2>&1; then
  remote_hash=$(sha256 -q "$REMOTE_JAR")
elif command -v shasum >/dev/null 2>&1; then
  remote_hash=$(shasum -a 256 "$REMOTE_JAR" | awk '{print $1}')
else
  echo "Не найден инструмент для SHA-256 на сервере" >&2
  exit 1
fi

if [ "$remote_hash" != "$EXPECTED_HASH" ]; then
  echo "Хеш не совпадает: локально $EXPECTED_HASH, удаленно $remote_hash" >&2
  exit 1
fi

echo "✅ Upload verified"
VERIFY_EOF

perl -pi -e "s/__APP_NAME__/$APP_NAME/g" "$VERIFY_SCRIPT_LOCAL"
perl -pi -e "s/__EXPECTED_SIZE__/$LOCAL_SIZE/g" "$VERIFY_SCRIPT_LOCAL"
perl -pi -e "s/__EXPECTED_HASH__/$LOCAL_HASH/g" "$VERIFY_SCRIPT_LOCAL"
run_cmd "ssh $SSH_OPTS -p $PORT $HOST 'bash -s' < '$VERIFY_SCRIPT_LOCAL'"
rm "$VERIFY_SCRIPT_LOCAL"

REMOTE_SCRIPT_LOCAL="$(mktemp)"
cat <<'REMOTE_EOF' > "$REMOTE_SCRIPT_LOCAL"
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="__APP_NAME__"
APP_PORT="__APP_PORT__"

APP_DIR="$HOME/$APP_NAME"
JAR_SOURCE="$HOME/${APP_NAME}.jar"
JAR_TARGET="$APP_DIR/${APP_NAME}.jar"
LOG_FILE="$APP_DIR/${APP_NAME}.log"
PID_FILE="$APP_DIR/${APP_NAME}.pid"

if [ ! -f "$JAR_SOURCE" ]; then
  echo "JAR $JAR_SOURCE не найден" >&2
  exit 1
fi

mkdir -p "$APP_DIR"

if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE" || true)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" || true
    sleep 2
  fi
  rm -f "$PID_FILE"
fi

pkill -f "${APP_NAME}.jar" 2>/dev/null || true

mv "$JAR_SOURCE" "$JAR_TARGET"

if [ -x /usr/local/openjdk17/bin/java ]; then
  JAVA_BIN="/usr/local/openjdk17/bin/java"
else
  JAVA_BIN="java"
fi

nohup "$JAVA_BIN" -Xms128m -Xmx256m -jar "$JAR_TARGET" --server.port="$APP_PORT" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

echo "Spring Boot запущен на порту $APP_PORT. Логи: $LOG_FILE"
REMOTE_EOF

perl -pi -e "s/__APP_NAME__/$APP_NAME/g" "$REMOTE_SCRIPT_LOCAL"
perl -pi -e "s/__APP_PORT__/$APP_PORT/g" "$REMOTE_SCRIPT_LOCAL"
REMOTE_TMP="/tmp/spring-boot-deploy-$RANDOM.sh"
run_cmd "scp $SCP_OPTS $SSH_OPTS -P $PORT '$REMOTE_SCRIPT_LOCAL' $HOST:$REMOTE_TMP"
rm "$REMOTE_SCRIPT_LOCAL"

echo "▶️  Applying remote configuration..."
run_cmd "ssh $SSH_OPTS -p $PORT $HOST 'bash $REMOTE_TMP && rm -f $REMOTE_TMP'"

echo "✅ Готово. Приложение должно быть доступно на http://localhost:${APP_PORT} (через ssh -L)."
