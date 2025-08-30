const Sequelize = require("sequelize");

module.exports = class UnivRequest extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                requestIdx: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                univName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                    comment: '대학교 이름 (필수)'
                },
                univPresident: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                    comment: '대학교 총장 (선택사항)'
                },
                univType: {
                    type: Sequelize.STRING(10),
                    allowNull: true,
                    comment: '대학교 연제 (2년제, 3년제, 4년제)'
                },
                univAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                    comment: '대학교 주소 (선택사항)'
                },
                requestStatus: {
                    type: Sequelize.ENUM('pending', 'completed'),
                    allowNull: false,
                    defaultValue: 'pending',
                    comment: '처리 상태 (미처리: pending, 처리완료: completed)'
                },
                requestDate: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    comment: '요청 날짜'
                },
                processedDate: {
                    type: Sequelize.DATE,
                    allowNull: true,
                    comment: '처리 완료 날짜'
                },
                adminNote: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                    comment: '관리자 메모'
                }
            },
            {
                sequelize,
                modelName: "UnivRequest",
                tableName: "tb_univrequest",
                charset: "utf8",
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // UnivRequest는 다른 테이블과의 관계가 없음 (독립적인 요청 테이블)
    }
};
