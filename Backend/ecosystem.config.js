module.exports = {
    apps: [
        {
            name: "backend",
            script: "./bin/www",
            interpreter: "nodemon",
            cwd: "/home/Project/SeniorSchool/Backend", // �~X�~S~\�~K~\ .env �~L~L�~]��~]� �~\~D�~X�~U~\ �~T~T�| ~I�~F| 리
            env: {
                RDB_HOST: "127.0.0.1",
                RDB_PORT: "3306",
                RDB_USERNAME: "root",
                RDB_PASSWORD: "cjswodlek12",
                RDB_DATABASE: "ReviewSiteDB",
                NODE_ENV: "production"
            }
        }
    ]
};