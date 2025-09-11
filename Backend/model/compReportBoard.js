const Sequelize = require('sequelize');

module.exports = class CompReportBoard extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            reportIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            boardIdx: {
                type: Sequelize.BIGINT,
                allowNull: false,
                comment: '신고된 게시글 인덱스'
            },
            serviceType: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'company',
                comment: '서비스 구분: company'
            },
            reportReason: {
                type: Sequelize.STRING(255),
                allowNull: true,
                comment: '신고 사유'
            },
            reportDate: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                comment: '신고 날짜'
            },
            reportStatus: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'pending',
                comment: '신고 처리 상태: pending, reviewed, rejected'
            },
            reportResult: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: '신고 처리 결과'
            },
            reporterId: {
                type: Sequelize.STRING(45),
                allowNull: true,
                comment: '신고자 ID'
            },
            isDeleted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '삭제 여부'
            },
        }, {
            sequelize,
            modelName: "CompReportBoard",
            tableName: "tb_comp_report_board",
            charset: "utf8mb4",
            timestamps: false,
        });
    }

    static associate(db) {
        // CompReportBoard와 CompBoard 간의 관계 설정
        db.CompReportBoard.belongsTo(db.CompBoard, { 
            foreignKey: "boardIdx", 
            targetKey: "boardIdx",
            as: 'board'
        });
    }
};
