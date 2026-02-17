const Sequelize = require('sequelize');

module.exports = class ServiceConfig extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                serviceId: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                    field: 'service_id'
                },
                slug: {
                    type: Sequelize.STRING(30),
                    allowNull: false,
                    unique: true,
                    comment: '서비스 슬러그 (URL 경로, 테이블 접두사)'
                },
                name: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                    comment: '서비스명'
                },
                displayName: {
                    type: Sequelize.STRING(60),
                    allowNull: true,
                    field: 'display_name',
                    comment: '표시명 (프론트용)'
                },
                emoji: {
                    type: Sequelize.STRING(10),
                    allowNull: true,
                    comment: '서비스 이모지'
                },
                color: {
                    type: Sequelize.STRING(20),
                    allowNull: true,
                    comment: '서비스 대표 색상'
                },
                templateType: {
                    type: Sequelize.ENUM('basic', 'company', 'restaurant'),
                    allowNull: false,
                    defaultValue: 'basic',
                    field: 'template_type',
                    comment: '템플릿 유형'
                },
                status: {
                    type: Sequelize.ENUM('active', 'inactive', 'deleted'),
                    allowNull: false,
                    defaultValue: 'active',
                    comment: '서비스 상태'
                },
                sortOrder: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    field: 'sort_order',
                    comment: '정렬 순서'
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'created_at',
                    comment: '생성일'
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'updated_at',
                    comment: '수정일'
                }
            },
            {
                sequelize,
                modelName: 'ServiceConfig',
                tableName: 'service_configs',
                charset: 'utf8mb4',
                timestamps: false,
            }
        );
    }

    static associate(db) {
        db.ServiceConfig.hasMany(db.ServiceFieldConfig, {
            foreignKey: 'service_id',
            sourceKey: 'serviceId',
            as: 'fields'
        });
    }
};
