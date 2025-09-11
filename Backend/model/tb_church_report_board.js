const Sequelize = require('sequelize');

module.exports = class ChurchReportBoard extends Sequelize.Model {
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
            },
            serviceType: {
                type: Sequelize.STRING(20),
                allowNull: false,
                comment: '서비스 구분: church, company 등',
            },
            reportReason: {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
            reportDate: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            reportStatus: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'pending',
                comment: '신고 처리 상태: pending, reviewed, rejected',
            },
            reportResult: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            reporterId: {
                type: Sequelize.STRING(45),
                allowNull: true,
            },
            isDeleted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: "ChurchReportBoard",
            tableName: "tb_church_report_board",
            charset: "utf8",
            timestamps: false,
        });
    }

    static associate(db) {
        // ChurchReportBoard와 ChurchBoard 간의 관계 설정
        db.ChurchReportBoard.belongsTo(db.ChurchBoard, { 
            foreignKey: "boardIdx", 
            targetKey: "boardIdx" 
        });
    }
};
