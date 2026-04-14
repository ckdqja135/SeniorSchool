const Sequelize = require("sequelize");

module.exports = class CrawlerKeyword extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                keywordIdx: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                keyword: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },
                region: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                    defaultValue: '서울',
                },
                usedCount: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                discoveryCount: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                isActive: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'created_at',
                },
            },
            {
                sequelize,
                modelName: 'CrawlerKeyword',
                tableName: 'tb_crawler_keywords',
                charset: 'utf8',
                timestamps: false,
            }
        );
    }

    static associate(db) {}
};
