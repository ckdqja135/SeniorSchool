const Sequelize = require('sequelize');

module.exports = class UnivBoardDetail extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            boardIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            univIdx: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            boardContent: {
                type: Sequelize.STRING(400),
                allowNull: true,
            },
            boardTitle: {
                type: Sequelize.STRING(60),
                allowNull: false,
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
            writerId: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            writerPw: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            boardRegDate: {
                type: Sequelize.STRING(60),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "UnivBoardDetail",
            tableName: "tb_univboarddetail",
            charset: "utf8",
            timestamps: false,
        });
    }

    static associate(db) {
        // db.UnivBoardDetail.belongsTo(db.UnivBoard, { foreignKey: "BoardNo", targetKey: "BoardNo" });
    }
};
