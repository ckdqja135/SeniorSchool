const Sequelize = require("sequelize");

module.exports = class ChurchRequest extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                requestIdx: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                churchName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                    comment: '교회 이름 (필수)'
                },
                churchPastor: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                    comment: '교회 담임목사 (선택사항)'
                },
                churchType: {
                    type: Sequelize.STRING(10),
                    allowNull: true,
                    comment: '교회 종류 (감리교, 장로교, 침례교 등)'
                },
                churchAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                    comment: '교회 주소 (선택사항)'
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
                modelName: "ChurchRequest",
                tableName: "tb_church_request",
                charset: "utf8",
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // ChurchRequest는 다른 테이블과의 관계가 없음 (독립적인 요청 테이블)
    }
};
