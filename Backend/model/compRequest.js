const Sequelize = require("sequelize");

module.exports = class CompRequest extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                requestIdx: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                compName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                    comment: '회사명 (필수)'
                },
                compCEO: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                    comment: '대표이사 (선택사항)'
                },
                compType: {
                    type: Sequelize.STRING(20),
                    allowNull: true,
                    comment: '회사 유형 (대기업, 중견기업, 중소기업, 스타트업)'
                },
                compIndustry: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                    comment: '업종'
                },
                compAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                    comment: '회사 주소 (선택사항)'
                },
                requestStatus: {
                    type: Sequelize.ENUM('pending', 'completed', 'rejected'),
                    allowNull: false,
                    defaultValue: 'pending',
                    comment: '처리 상태 (미처리: pending, 처리완료: completed, 거절: rejected)'
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
                },
                requesterId: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                    comment: '요청자 ID'
                }
            },
            {
                sequelize,
                modelName: "CompRequest",
                tableName: "tb_comp_request",
                charset: "utf8mb4",
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // CompRequest는 다른 테이블과의 관계가 없음 (독립적인 요청 테이블)
    }
};
