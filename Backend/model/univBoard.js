const Sequelize = require('sequelize');

module.exports = class UnivBoard extends Sequelize.Model {
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
            univIdx: {
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
            modelName: "UnivBoard",
            tableName: "tb_univboard",
            charset: "utf8",
            timestamps: false,
        });
    }

    static associate(db) {
        // db.UnivBoard.belongsTo(db.UniversityInfo, { foreignKey: "UnivNo", targetKey: "UnivNo" });
        // db.UnivBoard.hasMany(db.UnivComment, { foreignKey: "BoardNo", sourceKey: "BoardNo" });
        // UnivBoardDetail 관계 제거
    }
};