const Sequelize = require('sequelize');

module.exports = class ServiceFieldConfig extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                fieldId: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                    field: 'field_id'
                },
                serviceId: {
                    type: Sequelize.BIGINT,
                    allowNull: false,
                    field: 'service_id',
                    comment: '서비스 ID (FK)'
                },
                fieldKey: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                    field: 'field_key',
                    comment: '필드 키 (DB 컬럼명)'
                },
                fieldLabel: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                    field: 'field_label',
                    comment: '필드 라벨 (표시명)'
                },
                fieldType: {
                    type: Sequelize.ENUM('string', 'text', 'integer', 'bigint', 'double', 'decimal', 'boolean', 'date', 'enum'),
                    allowNull: false,
                    defaultValue: 'string',
                    field: 'field_type',
                    comment: '필드 데이터 타입'
                },
                fieldLength: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    field: 'field_length',
                    comment: '필드 길이 (string 타입 시)'
                },
                isRequired: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 0,
                    field: 'is_required',
                    comment: '필수 여부'
                },
                isSearchable: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 0,
                    field: 'is_searchable',
                    comment: '검색 대상 여부'
                },
                showInList: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                    field: 'show_in_list',
                    comment: '목록에 표시 여부'
                },
                showInDetail: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                    field: 'show_in_detail',
                    comment: '상세에 표시 여부'
                },
                showInAdmin: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                    field: 'show_in_admin',
                    comment: '어드민에 표시 여부'
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
                }
            },
            {
                sequelize,
                modelName: 'ServiceFieldConfig',
                tableName: 'service_field_configs',
                charset: 'utf8mb4',
                timestamps: false,
            }
        );
    }

    static associate(db) {
        db.ServiceFieldConfig.belongsTo(db.ServiceConfig, {
            foreignKey: 'service_id',
            targetKey: 'serviceId',
            as: 'service'
        });
    }
};
