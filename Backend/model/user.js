const Sequelize = require("sequelize");

module.exports = class User extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                idx: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                id: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                    unique: true,
                },
                pw: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                role: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                },
                salt: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                last_login: {
                    type: Sequelize.DATE,
                    allowNull: true,
                },
                status: {
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