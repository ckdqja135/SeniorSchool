const Sequelize = require('sequelize');

module.exports = class ChurchComment extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            commentIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            boardIdx: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
            commentLike: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            commentDepth: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            writerId: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            writerPw: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            commentParent: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            commentContent: {
                type: Sequelize.STRING(200),
                allowNull: false,
            },
            regDate: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            modDate: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
        }, {
            sequelize,
            modelName: "ChurchComment",
            tableName: "tb_church_comment",
            charset: "utf8",
            timestamps: false,
        });
    }

    static associate(db) {
        // ChurchComment와 ChurchBoard 간의 관계 설정
        db.ChurchComment.belongsTo(db.ChurchBoard, { 
            foreignKey: "boardIdx", 
            targetKey: "boardIdx" 
        });
    }
};
