const Sequelize = require('sequelize');

module.exports = class UnivBoard extends Sequelize.Model{
    static init(sequelize){ // init 메서드에는 테이블에 대한 설정
        return super.init({ // super.init메서드의 첫번째 인수가 테이블 컬럼에 대한 설정
                BoardNo: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                BoardTitle: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                UnivNo: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                },
                BoardRegDate: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                },
                BoardLike: {
                    type: Sequelize.BIGINT,
                    allowNull: false,
                    defaultValue: 0, // Assuming you want a default value of 0
                },
                BoardHits: {
                    type: Sequelize.BIGINT,
                    allowNull: false,
                    defaultValue: 0, // Assuming you want a default value of 0
                },
                BoardID: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                BoardPW: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },
            },
            { // super.init 메서드의 두번째 인수가 테이블 자체에 대한 옵션
                sequelize, // static init 메서드의 매개변수와 연결되는 옵션 db.sequelize 객체를 넣어야함
                modelName : "UnivBoard", // 모델 이름을 설정할 수 있음.
                tableName : "univboard", // 실제 데이터베이스의 테이블 이름이 됨.
                charset : "utf8", // 한글을 입력받기 위한 설정
                timestamps: false, // 이 줄을 추가하면 createdAt 및 updatedAt 컬럼이 생성되지 않음.
            });
    }
    static associate(db){} //static associate 메서드에는 다른 모델과의 관계 다른 모델들과 연결할때 사용
}
