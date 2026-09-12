/**
 * PM2 тохиргоо — Ubuntu сервер дээр dashboard-ыг ажиллуулна.
 *
 * Ашиглах:
 *   cd /var/www/tactiq
 *   pm2 start deploy/ecosystem.config.js
 *   pm2 save
 *
 * ЧУХАЛ: 127.0.0.1 дээр л сонсоно — гаднаас шууд хандах боломжгүй,
 * зөвхөн Nginx дамжуулна. Ингэснээр 3000 портыг галт ханаанд нээх
 * шаардлагагүй болно.
 *
 * ⚠ CLUSTER MODE: Олон зуун, мянган сурагч ЗЭРЭГ хандахад НЭГ CPU цөм
 * (fork mode, instances:1) хурдан хязгаартаа хүрдэг — Node.js нь нэг цөмд
 * НЭГ л процессоор ажилладаг. `exec_mode: "cluster"` нь Node-ийн cluster
 * модулиар дамжуулан PM2-д НЭГ ЛОГИК APP-ыг олон CPU цөм дээр зэрэг
 * ажиллуулж, ижил 3000 портыг ХУВААЛЦУУЛНА (Nginx тохиргоо өөрчлөх
 * шаардлагагүй — proxy_pass хэвээрээ 127.0.0.1:3000 руу заана).
 *
 * `instances`-ийг ГАРААР тохируулахын оронд серверийн бодит цөмийн тоогоор
 * (`os.cpus().length`) АВТОМАТААР тооцно, Postgres/Redis/Nginx-д 1 цөм
 * үлдээнэ (жишээ нь 4 vCPU → 3 instance). Эдгээр нь I/O-bound тул CPU бага
 * зарцуулдаг ч, нэг цөм ч үлдэхгүй бол хүсэлт бүрд шахагдана. 1 vCPU-той
 * бол `instances` 1 болж, `exec_mode` автоматаар "fork" болно (cluster mode
 * нэг цөмд утгагүй).
 *
 * ⚠ Cluster mode-д шилжихэд ЗААВАЛ Redis тохируулна (`REDIS_URL` .env.local
 * дотор) — эс бөгөөс хурдны хязгаарлагч (rateLimit.ts) БОЛОН унших-кэш
 * (cache.ts) instance тус бүрдээ тусдаа болж, хязгаар instance-ийн
 * тоогоор үржинэ (`src/lib/redis.ts` production дээр үүнийг warning-оор
 * анхааруулна).
 *
 * ⚠ ХОЛБОЛТЫН ТООЦОО: instance бүр өөрийн Postgres pool-той
 * (`DATABASE_POOL_MAX`, анхдагч 10) — 3 instance × 10 = 30 холболт. Нийт нь
 * Postgres-ийн `max_connections`-аас (анхдагч ихэвчлэн 100) хэтрэхгүй
 * эсэхийг шалгаарай.
 */
const os = require("os");
const instances = Math.max(1, os.cpus().length - 1);

module.exports = {
  apps: [
    {
      name: "tactiq",
      cwd: "/var/www/tactiq",
      // `npm run start` биш next-ийн binary-г шууд дуудна — PM2 restart хийхэд
      // npm дундын процесс үлдэхгүй, дохио (SIGINT) шууд апп руу очно.
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      instances,
      exec_mode: instances > 1 ? "cluster" : "fork",
      autorestart: true,
      /**
       * Апп унтарч→асах давталтад орвол (жишээ нь Postgres хүрэхгүй байх)
       * PM2 анхдагчаар секундэд олон удаа дахин асааж, CPU-г бүрэн иддэг —
       * ингэснээр сэргэх ёстой байсан сервер ч дийлэхээ болино. Exponential
       * backoff нь оролдлого бүрийн хооронд хүлээх хугацааг уртасгана.
       */
      exp_backoff_restart_delay: 200,
      /**
       * `pm2 reload` үед шинэ worker портоо сонсож эхлэхийг хэдэн мс хүлээх
       * вэ. Анхдагч 8 секунд нь ачаалалтай сервер дээр Next-ийн эхлэлд
       * хүрэлцэхгүй байж болно — хүрэлцэхгүй бол PM2 хуучин worker-ыг эрт
       * унтрааж, тэр агшинд 502 гарна.
       */
      listen_timeout: 30_000,
      // Next.js-ийн санах ойн алдагдал хуримтлагдвал автоматаар сэргээнэ.
      max_memory_restart: "700M",
      // `pm2 reload` (deploy.sh үзнэ үү) worker бүрийг НЭГ НЭГЭЭР солино —
      // энэ хугацаанд бусад worker хүсэлт хүлээж авсаар байх тул хэрэглэгч
      // downtime мэдэрдэггүй. `kill_timeout` нь идэвхтэй хүсэлтэд гүйцэж
      // дуусах цаг өгнө (SIGINT-ийн дараа).
      kill_timeout: 5_000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      error_file: "/var/log/tactiq/error.log",
      out_file: "/var/log/tactiq/out.log",
      time: true,
    },
  ],
};
