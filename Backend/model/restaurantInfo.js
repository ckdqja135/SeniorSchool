const Sequelize = require("sequelize");

module.exports = class RestaurantInfo extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                restaurantIdx: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                restaurantName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                },
                restaurantLocation: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                restaurantType: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                restaurantEstablished: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                restaurantOwner: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                restaurantLatX: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                restaurantLatY: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                restaurantURL: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                restaurantLotAddr: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },
                restaurantAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                restaurantMapIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                },
                restaurantStatus: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                },
                restaurantViewCount: {
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
                modelName: "RestaurantInfo",
                tableName: "tb_restaurant_info",
                charset: "utf8",
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // RestaurantInfo와 RestaurantBoard 간의 관계 설정
        db.RestaurantInfo.hasMany(db.RestaurantBoard, { 
            foreignKey: "restaurantIdx", 
            sourceKey: "restaurantIdx" 
        });
    }
};

