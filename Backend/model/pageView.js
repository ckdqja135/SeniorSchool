const Sequelize = require("sequelize");

module.exports = class PageView extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                pvIdx: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                pvPath: {
                    type: Sequelize.STRING(500),
                    allowNull: false,
                },
                pvIp: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                },
                pvUserAgent: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                },
                pvReferer: {
                    type: Sequelize.STRING(500),
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: "PageView",
                tableName: "page_views",
                timestamps: true,
                updatedAt: false,
            }
        );
    }
};
