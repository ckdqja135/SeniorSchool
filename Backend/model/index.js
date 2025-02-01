const Sequelize = require('sequelize');
const UnivBoard = require('./univBoard');
const University = require('./universityinfo');
const UnivBoardDetail = require('./univBoardDetail');
const UnivComment = require('./univcomment');
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
    logging: (msg) => logger.info(msg)  // Sequelize 쿼리 로그도 PM2에 기록
});

db.sequelize = sequelize;
db.UnivBoard = UnivBoard;
db.University = University;
db.UnivBoardDetail = UnivBoardDetail;
db.UnivComment = UnivComment;
//init이 실행되어야 테이블이 모델로 연결됨
UnivBoard.init(sequelize);
University.init(sequelize);
UnivBoardDetail.init(sequelize);
UnivComment.init(sequelize);

// 다른 테이블과의 관계를 연결함
UnivBoard.associate(db);
University.associate(db);
UnivBoardDetail.associate(db);
UnivComment.associate(db);
sequelize.authenticate()
    .then(() => logger.info('✅ 데이터베이스 연결 성공'))
    .catch((error) => logger.error(`❌ 데이터베이스 연결 실패: ${error.message}`));

// 모든 테이블 동기화
// sequelize.sync({ force: true })
//     .then(() => {
//         console.log('모든 테이블이 성공적으로 생성되었습니다.');
//     })
//     .catch(error => {
//         console.error('테이블 생성 중 에러 발생:', error);
//     });


// const createTableSQL = UnivComment.sync({ force: true }).toString();
module.exports = db;