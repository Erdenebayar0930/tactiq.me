#!/usr/bin/env bash
#
# СИСТЕМИЙН НӨӨЦЛӨЛТ — сан + эх код, хугацаатай цэвэрлэгээтэй.
#
# Ажиллуулах:
#   bash deploy/backup.sh                 # анхдагч тохиргоогоор
#   BACKUP_KEEP_DAYS=30 bash deploy/backup.sh
#
# ⚠ НУУЦ УТГА ОРОХГҮЙ. `.env.local`, `.env.production.local` хоёрыг
# ЗОРИУД хасна — нөөцлөлт нь үүлэн сан, гадаад диск рүү явдаг бөгөөд
# нууц үг тийш очвол дахин хуулбарлагдаж, устгасан ч кэшэнд үлдэнэ.
# Үйлдвэрлэлийн нууц ЗӨВХӨН сервер дээр амьдарна (`.env.example`).
#
# ⚠ ХУВИЙН МЭДЭЭЛЭЛ: dump дотор хүүхдийн бүртгэл (имэйл, нэр, явц,
# төлбөр) байна. Хадгалах газраа зөв сонгоно.
#
# ⚠ ХУГАЦАА ДУУССАНЫГ УСТГАХ НЬ АМЖИЛТТАЙ НӨӨЦЛӨЛТИЙН ДАРАА л явна.
# Эсрэгээр бол сан унтарсан өдөр шинэ нөөцлөлт бүтэлгүйтээд, хуучин
# нөөцлөлтүүд нь ЦЭВЭРЛЭГДЭЖ, гартаа юу ч үлдэхгүй болно.

set -euo pipefail

# --- Тохиргоо (орчноос дарж болно) ------------------------------------------

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# Нөөцлөлт хаана хадгалагдах вэ. ⚠ РЕПОГИЙН ГАДНА байх ёстой — дотор нь
# бол сангийн өгөгдөл санамсаргүйгээр git-д орох эрсдэлтэй.
BACKUP_DIR="${BACKUP_DIR:-${APP_DIR}/../backups}"

# ХЭДЭН ХОНОГ ХАДГАЛАХ ВЭ. Үүнээс хуучин нөөцлөлт устана.
#
# ⚠ 14 нь санамсаргүй тоо биш: эвдрэл нь ихэвчлэн тэр өдөртөө
# илэрдэггүй (жишээ нь буруу миграц долоо хоногийн дараа мэдэгдэнэ).
# Хоёр долоо хоног бол «эргэж очих» бодит цонх.
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

# Эх кодыг архивлах уу. Сервер дээр код нь git-д байдаг тул 0 болгож
# болно — тэр үед зөвхөн сан нөөцлөгдөж, хэмжээ олон дахин багасна.
BACKUP_CODE="${BACKUP_CODE:-1}"

# ⚠ Windows (Git Bash) дээр pg_dump нь PATH-д байдаггүй. Тиймээс
# дарж өгөх боломжтой: PG_DUMP="/c/Program Files/PostgreSQL/18/bin/pg_dump.exe"
PG_DUMP="${PG_DUMP:-pg_dump}"

# --- Бэлтгэл ----------------------------------------------------------------

STAMP="$(date +%Y%m%d-%H%M)"
OUT="${BACKUP_DIR}/daamal-${STAMP}"

# ⚠ `DATABASE_URL`-ыг орчноос, эс бөгөөс `.env.local`-оос уншина. Скриптэд
# ХЭЗЭЭ Ч бичихгүй — энэ файл git-д ордог.
if [[ -z "${DATABASE_URL:-}" && -f "${APP_DIR}/.env.local" ]]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "${APP_DIR}/.env.local" | cut -d= -f2- | tr -d '\r')"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL олдсонгүй (орчин ч, .env.local ч)." >&2
  exit 1
fi

mkdir -p "${OUT}"
echo "▶ Нөөцлөлт: ${OUT}"
echo "  хадгалах хугацаа: ${BACKUP_KEEP_DAYS} хоног"

# --- 1. Сан -----------------------------------------------------------------

# ⚠ `--clean --if-exists`: сэргээхэд байгаа хүснэгтийг эхлээд УСТГАНА.
#    Тиймээс сэргээх сан нь ХООСОН эсвэл зориуд дарж бичих ёстой.
# ⚠ `--no-owner --no-privileges`: өөр сервер дээр өөр хэрэглэгчтэй ч
#    сэргээгдэнэ. Эс бөгөөс «role "tactiq" does not exist» гэж унана.
echo "▶ 1/3  Сан"
"${PG_DUMP}" --no-owner --no-privileges --clean --if-exists \
  -f "${OUT}/db-tactiq.sql" "${DATABASE_URL}"
echo "     $(du -h "${OUT}/db-tactiq.sql" | cut -f1)"

# --- 2. Эх код --------------------------------------------------------------

if [[ "${BACKUP_CODE}" == "1" ]]; then
  echo "▶ 2/3  Эх код"
  PARENT="$(dirname "${APP_DIR}")"
  APP_NAME="$(basename "${APP_DIR}")"

  tar -czf "${OUT}/code-${APP_NAME}.tar.gz" \
    --exclude='node_modules' --exclude='.next' --exclude='tsconfig.tsbuildinfo' \
    --exclude='.env.local' --exclude='.env.production.local' --exclude='.env.*.local' \
    -C "${PARENT}" "${APP_NAME}"
  echo "     $(du -h "${OUT}/code-${APP_NAME}.tar.gz" | cut -f1)"

  # Тэмцээний сервер — ХАЖУУД нь байвал (заавал биш).
  if [[ -d "${PARENT}/daamal-tournament" ]]; then
    tar -czf "${OUT}/code-tournament.tar.gz" \
      --exclude='node_modules' --exclude='.next' --exclude='tsconfig.tsbuildinfo' \
      --exclude='.env.local' --exclude='.env.production.local' --exclude='.env.*.local' \
      -C "${PARENT}" "daamal-tournament"
    echo "     $(du -h "${OUT}/code-tournament.tar.gz" | cut -f1)"
  fi
else
  echo "▶ 2/3  Эх код — алгасав (BACKUP_CODE=0)"
fi

# --- 3. Сэргээх заавар ------------------------------------------------------

cat > "${OUT}/README.md" <<EOF
# Daamal / Tactiq — нөөцлөлт ${STAMP}

⛔ **Нууц утга ОРООГҮЙ** (\`.env.local\`, \`.env.production.local\`).
Сэргээхдээ \`.env.example\`-ээс хуулж, утгыг серверээс авна.

⚠ Dump дотор **хэрэглэгчдийн хувийн мэдээлэл** байна.

## Сэргээх

\`\`\`bash
tar -xzf code-*.tar.gz
cd tactiq.me && npm ci
cp .env.example .env.local && nano .env.local && chmod 600 .env.local

createdb tactiq
psql -d tactiq -f db-tactiq.sql   # ⚠ байгаа хүснэгтийг УСТГАНА

npm run build
\`\`\`
EOF

# --- 4. Хугацаа дууссаныг цэвэрлэх ------------------------------------------
#
# ⚠ ЗӨВХӨН ЭНД, бүх алхам АМЖИЛТТАЙ болсны дараа. `set -e` тул дээр
# ямар нэг зүйл унавал энэ мөр хүртэл хүрэхгүй — хуучин нөөцлөлт
# хэвээр үлдэнэ.

echo "▶ 3/3  Хуучин нөөцлөлт (${BACKUP_KEEP_DAYS} хоногоос дээш)"
REMOVED=0
while IFS= read -r old; do
  [[ -z "${old}" ]] && continue
  rm -rf "${old}"
  echo "     устгав: $(basename "${old}")"
  REMOVED=$((REMOVED + 1))
done < <(find "${BACKUP_DIR}" -maxdepth 1 -type d -name 'daamal-*' -mtime "+${BACKUP_KEEP_DAYS}" 2>/dev/null)
[[ "${REMOVED}" == "0" ]] && echo "     устгах зүйл алга"

KEPT="$(find "${BACKUP_DIR}" -maxdepth 1 -type d -name 'daamal-*' | wc -l | tr -d ' ')"
echo ""
echo "✅ Дууслаа — ${OUT}"
echo "   нийт ${KEPT} нөөцлөлт, $(du -sh "${BACKUP_DIR}" | cut -f1)"
