// PM2 설정 — Backend (NestJS + Prisma)
//
// - script: 빌드 산출물 dist/main.js 를 node 로 직접 실행 (nodemon 없음; 운영에서 파일 감시는 불필요)
// - env: DB 비밀정보를 여기 적지 않는다. main.ts 의 dotenv.config() 가 cwd 의 .env 를 읽으므로
//        서버의 Backend/.env 에 RDB_*, DATABASE_URL, JWT_SECRET, 외부 API 키를 둔다.
// - cwd: 반드시 Backend 여야 한다. 업로드 정적 경로가 process.cwd()/public/uploads 기준이다.
//
// 서버에서 기존 backend2 프로세스를 쓰고 있었다면 (Backend2 디렉터리 → Backend 통합분 반영)
//   cd /home/Project/SeniorSchool
//   pm2 stop backend2 && pm2 delete backend2      # cwd 가 바뀌어 reload 로는 반영되지 않는다
//   git pull                                       # Backend2 가 Backend 로 합쳐진 커밋
//   cd Backend && npm ci && npx prisma generate && npm run build
//   pm2 start ecosystem.config.js --only backend && pm2 save
//   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/restaurant/nearby?lat=37.5665&lng=126.978&radius=1&limit=1   # 200 확인
//
// 재배포
//   git pull && npm ci && npx prisma generate && npm run build && pm2 reload backend
module.exports = {
    apps: [
        {
            name: 'backend',
            script: 'dist/main.js',
            cwd: '/home/Project/SeniorSchool/Backend',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            max_memory_restart: '600M',
            // 크래시 루프 방지: 10초 안에 15번 넘게 죽으면 재시작 중단
            min_uptime: '10s',
            max_restarts: 15,
            env: {
                NODE_ENV: 'production',
                PORT: '3000',
                NODE_NO_WARNINGS: '1',
            },
            out_file: './logs/pm2-out.log',
            error_file: './logs/pm2-error.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
