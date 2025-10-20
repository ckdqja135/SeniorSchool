const Sequelize = require('sequelize');

module.exports = class FreeBoardStats extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            statIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                comment: '통계 인덱스'
            },
            category: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: '카테고리'
            },
            tag: {
                type: Sequelize.STRING(50),
                allowNull: true,
                comment: '태그'
            },
            count: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 1,
                comment: '카운트'
            },
            lastUpdated: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                comment: '마지막 업데이트'
            }
        }, {
            sequelize,
            modelName: "FreeBoardStats",
            tableName: "tb_freeboard_stats",
            charset: "utf8mb4",
            timestamps: false,
        });
    }

    static associate(db) {
        // 통계 테이블은 별도의 관계 설정이 필요하지 않음
    }
};
