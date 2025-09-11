const Sequelize = require('sequelize');

module.exports = class ChurchBoard extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            boardIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            boardTitle: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            boardContent: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            churchIdx: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            boardRegDate: {
                type: Sequelize.STRING(45),
                allowNull: true,
            },
            boardLike: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            boardHits: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            boardID: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            boardPW: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: "ChurchBoard",
            tableName: "tb_church_board",
            charset: "utf8",
            timestamps: false,
        });
    }

    static associate(db) {
        // ChurchBoard와 ChurchInfo 간의 관계 설정
        db.ChurchBoard.belongsTo(db.ChurchInfo, { 
            foreignKey: "churchIdx", 
            targetKey: "churchIdx",
            as: 'church'
        });
        
        // ChurchBoard와 ChurchComment 간의 관계 설정
        db.ChurchBoard.hasMany(db.ChurchComment, { 
            foreignKey: "boardIdx", 
            sourceKey: "boardIdx" 
        });
    }
};
