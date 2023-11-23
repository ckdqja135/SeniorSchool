const Sequelize = require('sequelize');
const UnivBoard = require('./univBoard');
const University = require('./universityinfo');
const UnivBoardDetail = require('./univBoardDetail');
const UnivComment = require('./univcomment');
const config = require('../conf/sequelize');
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, {
    dialect: 'mariadb',
    dialectOptions: {
        options: {
            requestTimeout: 3000
        }
    },
    logging: console.log
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
// const createTableSQL = UnivComment.sync({ force: true }).toString();
module.exports = db;