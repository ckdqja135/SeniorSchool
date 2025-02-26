const Sequelize = require("sequelize");

module.exports = class User extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                userIdx: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                userId: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                    unique: true,
                },
                userPw: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                userRole: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                },
                salt: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                lastLogin: {
                    type: Sequelize.DATE,
                    allowNull: true,
                },
                userStatus: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                },
            },
            {
                sequelize,
                modelName: "User",
                tableName: "tb_user",
                charset: "utf8",
                timestamps: false,
            }
        );
    }

    static associate(db) {
    }
};