#!/usr/bin/env bash
#
# Ubuntu сервер дээр НЭГ УДАА ажиллуулах бэлтгэл скрипт.
# Node 20, PostgreSQL, Redis, Nginx, PM2-г суулгаад, апп-ын фолдер, лог, галт
# хана, swap-ыг тохируулна. Дахин ажиллуулж болно (idempotent).
#
# Ашиглах:
#   sudo bash deploy/setup-server.sh
#
# Үүний ДАРАА: .env.local бөглөх → deploy/deploy.sh ажиллуулах.

set -euo pipefail

APP_NAME="tactiq"
APP_DIR="/var/www/${APP_NAME}"
LOG_DIR="/var/log/${APP_NAME}"
DB_NAME="tactiq"
DB_USER="tactiq"
REPO_URL="https://github.com/Erdenebayar0930/tactiq.git"
NODE_MAJOR=20

if [[ $EUID -ne 0 ]]; then
  echo "❌ root эрхээр ажиллуулна уу: sudo bash deploy/setup-server.sh" >&2
  exit 1
fi

echo "▶ 1/9  Системийн багцууд"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates gnupg nginx postgresql postgresql-contrib redis-server ufw

echo "▶ 2/9  Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
echo "   node $(node -v) / npm $(npm -v)"

echo "▶ 3/9  PM2"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

echo "▶ 4/9  Swap (build үед санах ой дутвал OOM болохоос сэргийлнэ)"
# 2GB-аас бага RAM-тай сервер дээр `next build` санах ой дуусгадаг.
if [[ ! -f /swapfile ]] && [[ "$(free -m | awk '/^Mem:/{print $2}')" -lt 2048 ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "   2GB swap нэмэгдлээ"
else
  echo "   swap шаардлагагүй эсвэл аль хэдийн байна"
fi

echo "▶ 5/9  PostgreSQL — ${DB_NAME} сан, ${DB_USER} хэрэглэгч"
# ⚠ Tactiq нь PostgreSQL ашигладаг — MySQL/MariaDB БИШ.
# Баталгаа: `package.json` → `pg` драйвер, `drizzle.config.ts` →
# `dialect: "postgresql"`, `src/lib/db/schema.ts` → `drizzle-orm/pg-core`.
# (Энд өмнө нь MariaDB суулгадаг байсан — тэр нь өөр төслөөс хуулагдсан
# алдаа бөгөөд ажиллуулсан сервер дээр апп сан руугаа огт холбогдохгүй
# байсан. Хуучин сервер дээр `apt-get purge mariadb-server` хийж болно.)
systemctl enable --now postgresql

# `postgres` систем хэрэглэгчийн эрхээр psql дуудна (peer authentication).
psql_su() { su - postgres -c "psql -v ON_ERROR_STOP=1 $*"; }

if [[ "$(psql_su -tAc "\"SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'\"")" != "1" ]]; then
  DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
  psql_su -c "\"CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';\""
  echo ""
  echo "   ⚠ ЭНЭ НУУЦ ҮГИЙГ ХАДГААЛААРАЙ — дахин харагдахгүй:"
  echo "   DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
  echo ""
else
  echo "   ${DB_USER} role аль хэдийн байна — нууц үг хэвээр"
fi

# `CREATE DATABASE`-д IF NOT EXISTS байхгүй тул эхлээд шалгана (idempotent).
if [[ "$(psql_su -tAc "\"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"")" != "1" ]]; then
  psql_su -c "\"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER} ENCODING 'UTF8';\""
else
  echo "   ${DB_NAME} сан аль хэдийн байна"
fi

# `npm run db:push` нь хүснэгт үүсгэдэг тул схемийн эрх хэрэгтэй. PostgreSQL
# 15-аас эхлэн `public` схем дээр эзэн бус хэрэглэгчид CREATE эрхгүй болсон —
# энэ мөргүйгээр db:push "permission denied for schema public" гэж унана.
psql_su -d "${DB_NAME}" -c "\"GRANT ALL ON SCHEMA public TO ${DB_USER};\""

# ⚠ ХОЛБОЛТЫН ТООЦОО: PM2 cluster mode-д instance бүр өөрийн pool-той
# (`DATABASE_POOL_MAX`, анхдагч 10). Анхдагч `max_connections=100` нь 3-7
# instance-д хүрэлцэнэ, гэхдээ олон хандалттай үед нөөц бага үлдэнэ.
# Одоогийн утгыг мэдэж байвал тохируулах шийдвэр гаргахад хялбар:
echo "   Postgres max_connections = $(psql_su -tAc "\"SHOW max_connections\"" | tr -d ' ')"
echo "   (Хэрэгтэй бол: DATABASE_POOL_MAX × PM2 instance ≤ max_connections − 10)"

echo "▶ 6/9  Redis"
# ⚠ ЗӨВХӨН PM2 cluster mode ашиглаж байгаа тул шаардлагатай (deploy/
# ecosystem.config.js) — instance хоорондын хурдны хязгаарлагч, курсын
# каталогийн кэшийг ХУВААЛЦАХАД хэрэглэгдэнэ. Анхдагч тохиргоо зөвхөн
# localhost-оор сонсдог тул нэмэлт хамгаалалт шаардахгүй.
systemctl enable --now redis-server

echo "▶ 7/9  Фолдер ба лог"
mkdir -p "${LOG_DIR}"
if [[ ! -d "${APP_DIR}/.git" ]]; then
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone "${REPO_URL}" "${APP_DIR}"
else
  echo "   ${APP_DIR} аль хэдийн clone хийгдсэн"
fi

echo "▶ 8/9  Nginx"
if [[ ! -f /etc/nginx/sites-available/${APP_NAME} ]]; then
  cp "${APP_DIR}/deploy/nginx/tactiq.conf" "/etc/nginx/sites-available/${APP_NAME}"
  ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
  rm -f /etc/nginx/sites-enabled/default
  echo "   ✓ server_name = daamal.org (+ www → apex 301)"
fi

echo "▶ 9/9  Галт хана"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

cat <<EOF

✅ Бэлтгэл дууслаа.

Дараагийн алхмууд:
  1. Nginx-ийг ачаалах:
       sudo nginx -t && sudo systemctl reload nginx
     (Домэйн нь daamal.org гэж бичигдсэн — өөр домэйн бол server_name-г засна.)

  2. Орчны хувьсагч бөглөх (энэ файл git-д ОРОХГҮЙ):
       sudo cp ${APP_DIR}/.env.example ${APP_DIR}/.env.local
       sudo nano ${APP_DIR}/.env.local
     DATABASE_URL (дээрх мэдэгдэлд хэвлэгдсэн), REDIS_URL=redis://127.0.0.1:6379,
     Firebase-ийн бүх түлхүүрийг оруулна.

  3. Схем үүсгэх:
       cd ${APP_DIR} && npm ci && npm run db:push

  4. Апп-ыг ачаалах (PM2 cluster mode — deploy/ecosystem.config.js):
       sudo bash ${APP_DIR}/deploy/deploy.sh

  5. SSL (daamal.org БОЛОН www.daamal.org хоёулаа энэ сервер рүү заасны дараа):
       sudo apt-get install -y certbot python3-certbot-nginx
       sudo certbot --nginx -d daamal.org -d www.daamal.org
EOF
