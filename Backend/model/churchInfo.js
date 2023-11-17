const Sequelize = require('sequelize');

module.exports = class ChurchInfo extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                ChurchNo: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                ChurchName: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                ChurchLocate: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                ChurchReli: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                ChurchEstablish: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                },
                ChurchPastor: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                ChurchTel: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                ChurchLateX: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                ChurchLateY: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                ChurchHome: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                ChurchSerIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                ChurchJibun: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                ChurchAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                ChurchMapIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
            },
            {
                sequelize,
                modelName: "ChurchInfo",
                tableName: "churchinfo",
                charset: "utf8",
                timestamps: false
            }
        );
    }
    static associate(db){}
};
