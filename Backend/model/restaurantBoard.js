const Sequelize = require('sequelize');

module.exports = class RestaurantBoard extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            boardIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            boardTitle: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            boardContent: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            restaurantIdx: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            boardRegDate: {
                type: Sequelize.STRING(45),
                allowNull: true,
            },
            boardLike: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            boardHits: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            boardRating: {
                type: Sequelize.DECIMAL(2, 1),
                allowNull: true,
                comment: '후기 평점 (0.5 ~ 5.0)'
            },
            boardID: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            boardPW: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: "RestaurantBoard",
            tableName: "tb_restaurant_board",
            charset: "utf8",
            timestamps: false,
        });
    }

    static associate(db) {
        // RestaurantBoard와 RestaurantInfo 간의 관계 설정
        db.RestaurantBoard.belongsTo(db.RestaurantInfo, { 
            foreignKey: "restaurantIdx", 
            targetKey: "restaurantIdx",
            as: 'restaurant'
        });
        
        // RestaurantBoard와 RestaurantComment 간의 관계 설정
        db.RestaurantBoard.hasMany(db.RestaurantComment, { 
            foreignKey: "boardIdx", 
            sourceKey: "boardIdx" 
        });
    }
};

