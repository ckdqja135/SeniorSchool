const Sequelize = require('sequelize');
const univBoard = require('./univBoard');
const university = require('./universityinfo');
const reportBoard = require('./tb_report_board');
const user = require('./user');
const univComment = require('./univcomment');
const config = require('../conf/sequelize');
const logger = require('../utils/logger');

const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, {
    dialect: 'mariadb',
    dialectOptions: {
        options: {
            requestTimeout: 3000
        }
    },
    logging: false
    // logging: (msg) => logger.info(msg)  // Sequelize 쿼리 로그도 PM2에 기록
});

db.sequelize = sequelize;
db.UnivBoard = univBoard;   
db.University = university;
db.UnivComment = univComment;
db.User = user;
db.ReportBoard = reportBoard;

//init이 실행되어야 테이블이 모델로 연결됨
univBoard.init(sequelize);
university.init(sequelize);
univComment.init(sequelize);
user.init(sequelize);
reportBoard.init(sequelize);


// 다른 테이블과의 관계를 연결함
univBoard.associate(db);
university.associate(db);
univComment.associate(db);
user.associate(db);
reportBoard.associate(db);
sequelize.authenticate()
    .then(() => logger.info('✅ 데이터베이스 연결 성공'))
    .catch((error) => logger.error(`❌ 데이터베이스 연결 실패: ${error.message}`));

// 모든 테이블 동기화
// sequelize.sync({ alter: true })
//     .then(() => {
//         console.log('모든 테이블이 성공적으로 생성되었습니다.');
//     })
//     .catch(error => {
//         console.error('테이블 생성 중 에러 발생:', error);
//     });


// const createTableSQL = UnivComment.sync({ force: true }).toString();
module.exports = db;