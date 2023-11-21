const Sequelize = require('sequelize');

module.exports = class UniversityInfo extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                UnivNo: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                UnivName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                },
                UnivLocate: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                UnivType: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                UnivEstablish: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                UnivPresident: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                UnivCampos: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                UnivLateX: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                UnivLateY: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                UnivPageURL: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                UnivIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                UnivLotAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                UnivAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                UnivMapIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
            },
            {
                sequelize,
                modelName: 'UniversityInfo',
                tableName: 'universityinfo',
                charset: 'utf8',
                timestamps: false,
            }
        );
    }
    static associate(db) {}
};
