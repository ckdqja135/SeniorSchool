const Sequelize = require('sequelize');

module.exports = class UnivBoard extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            BoardNo: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            BoardTitle: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            UnivNo: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            BoardRegDate: {
                type: Sequelize.STRING(45),
                allowNull: true,
            },
            BoardLike: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            BoardHits: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            BoardID: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            BoardPW: {
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
        // db.UnivBoard.hasOne(db.UnivBoardDetail, { foreignKey: "BoardNo", sourceKey: "BoardNo" });
        // db.UnivBoard.hasMany(db.UnivComment, { foreignKey: "BoardNo", sourceKey: "BoardNo" });
    }
};
