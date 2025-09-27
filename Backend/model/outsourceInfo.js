const Sequelize = require("sequelize");

module.exports = class OutsourceInfo extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                outsourceIdx: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                outsourceName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                },
                outsourceLocation: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                outsourceType: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                outsourceEstablished: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                outsourceCEO: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                outsourceLatX: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                outsourceLatY: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                outsourceURL: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                outsourceLotAddr: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                },
                outsourceAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                outsourceMapIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                },
                outsourceStatus: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                },
                outsourceViewCount: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
            },
            {
                sequelize,
                modelName: "OutsourceInfo",
                tableName: "tb_outsource_info",
                charset: "utf8",
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // OutsourceInfo와 OutsourceBoard 간의 관계 설정
        db.OutsourceInfo.hasMany(db.OutsourceBoard, { 
            foreignKey: "outsourceIdx", 
            sourceKey: "outsourceIdx" 
        });
    }
};
