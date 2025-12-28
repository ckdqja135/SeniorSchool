const Sequelize = require("sequelize");

module.exports = class OutsourceRequest extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                requestIdx: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                outsourceName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                    comment: '외주업체 이름 (필수)'
                },
                outsourceCEO: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                    comment: '외주업체 대표자명 (선택사항)'
                },
                outsourceType: {
                    type: Sequelize.STRING(10),
                    allowNull: true,
                    comment: '외주 종류 (웹개발, 앱개발, 디자인, 마케팅 등)'
                },
                outsourceAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                    comment: '외주업체 주소 (선택사항)'
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
                },
                requestData: {
                    type: Sequelize.JSON,
                    allowNull: true,
                    comment: '요청 데이터 (JSON 형식으로 모든 요청 정보 저장)'
                }
            },
            {
                sequelize,
                modelName: "OutsourceRequest",
                tableName: "tb_outsource_request",
                charset: "utf8",
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // OutsourceRequest는 다른 테이블과의 관계가 없음 (독립적인 요청 테이블)
    }
};
