const Sequelize = require('sequelize');
const univBoard = require('./univBoard');
const university = require('./universityinfo');
const reportBoard = require('./tb_report_board');
const user = require('./user');
const univComment = require('./univcomment');
const univRequest = require('./tb_univ_request');
const compInfo = require('./compInfo');
const compBoard = require('./compBoard');
const compComment = require('./compComment');
const compRequest = require('./compRequest');
const compStatistics = require('./compStatistics');
const compInterview = require('./compInterview');
const compSalary = require('./compSalary');
const churchInfo = require('./churchInfo');
const churchBoard = require('./churchBoard');
const churchComment = require('./churchComment');
const churchRequest = require('./tb_church_request');
const outsourceInfo = require('./outsourceInfo');
const outsourceBoard = require('./outsourceBoard');
const outsourceComment = require('./outsourceComment');
const outsourceRequest = require('./tb_outsource_request');
const restaurantInfo = require('./restaurantInfo');
const restaurantBoard = require('./restaurantBoard');
const restaurantComment = require('./restaurantComment');
const restaurantRequest = require('./tb_restaurant_request');
const freeBoard = require('./freeBoard');
const freeBoardComment = require('./freeBoardComment');
const freeBoardStats = require('./freeBoardStats');
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
db.UnivRequest = univRequest;
db.CompInfo = compInfo;
db.CompBoard = compBoard;
db.CompComment = compComment;
db.CompRequest = compRequest;
db.CompStatistics = compStatistics;
db.CompInterview = compInterview;
db.CompSalary = compSalary;
db.ChurchInfo = churchInfo;
db.ChurchBoard = churchBoard;
db.ChurchComment = churchComment;
db.ChurchRequest = churchRequest;
db.OutsourceInfo = outsourceInfo;
db.OutsourceBoard = outsourceBoard;
db.OutsourceComment = outsourceComment;
db.OutsourceRequest = outsourceRequest;
db.RestaurantInfo = restaurantInfo;
db.RestaurantBoard = restaurantBoard;
db.RestaurantComment = restaurantComment;
db.RestaurantRequest = restaurantRequest;
db.FreeBoard = freeBoard;
db.FreeBoardComment = freeBoardComment;
db.FreeBoardStats = freeBoardStats;

//init이 실행되어야 테이블이 모델로 연결됨
univBoard.init(sequelize);
university.init(sequelize);
univComment.init(sequelize);
user.init(sequelize);
reportBoard.init(sequelize);
univRequest.init(sequelize);
compInfo.init(sequelize);
compBoard.init(sequelize);
compComment.init(sequelize);
compRequest.init(sequelize);
compStatistics.init(sequelize);
compInterview.init(sequelize);
compSalary.init(sequelize);
churchInfo.init(sequelize);
churchBoard.init(sequelize);
churchComment.init(sequelize);
churchRequest.init(sequelize);
outsourceInfo.init(sequelize);
outsourceBoard.init(sequelize);
outsourceComment.init(sequelize);
outsourceRequest.init(sequelize);
restaurantInfo.init(sequelize);
restaurantBoard.init(sequelize);
restaurantComment.init(sequelize);
restaurantRequest.init(sequelize);
freeBoard.init(sequelize);
freeBoardComment.init(sequelize);
freeBoardStats.init(sequelize);


// 다른 테이블과의 관계를 연결함
univBoard.associate(db);
university.associate(db);
univComment.associate(db);
user.associate(db);
reportBoard.associate(db);
univRequest.associate(db);
compInfo.associate(db);
compBoard.associate(db);
compComment.associate(db);
compRequest.associate(db);
compStatistics.associate(db);
compInterview.associate(db);
compSalary.associate(db);
churchInfo.associate(db);
churchBoard.associate(db);
churchComment.associate(db);
churchRequest.associate(db);
outsourceInfo.associate(db);
outsourceBoard.associate(db);
outsourceComment.associate(db);
outsourceRequest.associate(db);
restaurantInfo.associate(db);
restaurantBoard.associate(db);
restaurantComment.associate(db);
restaurantRequest.associate(db);
freeBoard.associate(db);
freeBoardComment.associate(db);
freeBoardStats.associate(db);

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