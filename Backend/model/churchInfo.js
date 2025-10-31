const Sequelize = require("sequelize");

module.exports = class ChurchInfo extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                churchIdx: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                churchName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                },
                churchLocation: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                churchType: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                churchEstablished: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                churchPastor: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                churchLatX: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                churchLatY: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                churchURL: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                churchLotAddr: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                },
                churchAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                churchMapIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                },
                churchStatus: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                },
                churchViewCount: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'created_at',
                    comment: '등록일'
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'updated_at',
                    comment: '수정일'
                },
            },
            {
                sequelize,
                modelName: "ChurchInfo",
                tableName: "tb_church_info",
                charset: "utf8",
                timestamps: false,
                underscored: true,
            }
        );
    }

    static associate(db) {
        // ChurchInfo와 ChurchBoard 간의 관계 설정
        db.ChurchInfo.hasMany(db.ChurchBoard, { 
            foreignKey: "churchIdx", 
            sourceKey: "churchIdx" 
        });
    }
};
