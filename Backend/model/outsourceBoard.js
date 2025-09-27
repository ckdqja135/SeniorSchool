const Sequelize = require('sequelize');

module.exports = class OutsourceBoard extends Sequelize.Model {
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
            outsourceIdx: {
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
            modelName: "OutsourceBoard",
            tableName: "tb_outsource_board",
            charset: "utf8",
            timestamps: false,
        });
    }

    static associate(db) {
        // OutsourceBoard와 OutsourceInfo 간의 관계 설정
        db.OutsourceBoard.belongsTo(db.OutsourceInfo, { 
            foreignKey: "outsourceIdx", 
            targetKey: "outsourceIdx",
            as: 'outsource'
        });
        
        // OutsourceBoard와 OutsourceComment 간의 관계 설정
        db.OutsourceBoard.hasMany(db.OutsourceComment, { 
            foreignKey: "boardIdx", 
            sourceKey: "boardIdx" 
        });
    }
};
