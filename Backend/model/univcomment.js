const Sequelize = require('sequelize');

module.exports = class UnivComment extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                CommentId: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                BoardNo: {
                    type: Sequelize.BIGINT,
                    allowNull: false,
                },
                CommentLike: {
                    type: Sequelize.BIGINT,
                    allowNull: false,
                    defaultValue: 0,
                },
                CommentDepth: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                },
                WriterId: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                WriterPw: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },
                CommnetPerent: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                },
                CommentContent: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
            },
            {
                sequelize,
                modelName: 'UnivComment',
                tableName: 'univcomment',
                charset: 'utf8',
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // Add associations if there are any
    }
};
