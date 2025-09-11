const Sequelize = require("sequelize");

module.exports = class CompStatistics extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                statIdx: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                compIdx: {
                    type: Sequelize.BIGINT,
                    allowNull: false,
                    comment: '회사 인덱스 (외래키)'
                },
                year: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    comment: '통계 연도'
                },
                quarter: {
                    type: Sequelize.TINYINT,
                    allowNull: true,
                    comment: '분기 (1, 2, 3, 4) - NULL이면 연간 데이터'
                },
                totalEmployees: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: '총 직원 수'
                },
                newHires: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: '신규 입사자 수'
                },
                resignations: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: '퇴사자 수'
                },
                hireRate: {
                    type: Sequelize.DECIMAL(5, 2),
                    allowNull: true,
                    comment: '입사율 (%)'
                },
                turnoverRate: {
                    type: Sequelize.DECIMAL(5, 2),
                    allowNull: true,
                    comment: '퇴사율 (%)'
                },
                netGrowth: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: '순증가 인원 (입사자 - 퇴사자)'
                },
                avgSalary: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    comment: '평균 연봉'
                },
                minSalary: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    comment: '최저 연봉'
                },
                maxSalary: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    comment: '최고 연봉'
                },
                medianSalary: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    comment: '중간값 연봉'
                },
                avgBonus: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    comment: '평균 보너스'
                },
                avgBenefits: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    comment: '평균 복리후생비'
                },
                dataSource: {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                    comment: '데이터 출처 (API명)'
                },
                apiResponseData: {
                    type: Sequelize.JSON,
                    allowNull: true,
                    comment: '원본 API 응답 데이터 (JSON)'
                },
                lastUpdated: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    comment: '마지막 업데이트 일시'
                },
                isActive: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                    comment: '데이터 활성 상태 (1: 활성, 0: 비활성)'
                },
                regDate: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    comment: '등록일'
                },
                modDate: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    comment: '수정일'
                }
            },
            {
                sequelize,
                modelName: "CompStatistics",
                tableName: "tb_comp_statistics",
                charset: "utf8mb4",
                timestamps: false,
                indexes: [
                    {
                        unique: true,
                        fields: ['compIdx', 'year', 'quarter'],
                        name: 'unique_comp_year_quarter'
                    }
                ]
            }
        );
    }

    static associate(db) {
        // CompStatistics와 CompInfo 간의 관계 설정 (ORM 레벨에서만)
        db.CompStatistics.belongsTo(db.CompInfo, { 
            foreignKey: "compIdx", 
            targetKey: "compIdx",
            as: 'company'
        });
    }
};
