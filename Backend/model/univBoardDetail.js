const Sequelize = require('sequelize');

module.exports = class UnivBoardDetail extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                BoardNo: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                UnivNo: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                },
                BoardContent: {
                    type: Sequelize.STRING(400),
                    allowNull: true,
                },
                BoardTitle: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
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
                WriterId: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                WriterPw: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },
                BoardRegDate: {
                    type: Sequelize.STRING(60),
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'UnivBoardDetail',
                tableName: 'univboarddetail',
                charset: 'utf8',
                timestamps: false,
            }
        );
    }
    static associate(db) {}
};