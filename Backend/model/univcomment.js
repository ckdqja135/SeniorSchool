const Sequelize = require('sequelize');

module.exports = class UnivComment extends Sequelize.Model {
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
            commnetPerent: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            commentContent: {
                type: Sequelize.STRING(200),
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: "UnivComment",
            tableName: "tb_univcomment",
            charset: "utf8",
            timestamps: false,
        });
    }

    static associate(db) {
        // db.UnivComment.belongsTo(db.UnivBoard, { foreignKey: "BoardNo", targetKey: "BoardNo" });
    }
};
