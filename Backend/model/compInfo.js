const Sequelize = require("sequelize");

module.exports = class CompInfo extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                compIdx: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                compName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                    comment: '회사명'
                },
                compLocate: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                    comment: '회사 위치 (시/도)'
                },
                compType: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                    comment: '회사 유형 (대기업, 중견기업, 중소기업, 스타트업 등)'
                },
                compEstablish: {
                    type: Sequelize.STRING(45),
                    allowNull: true,
                    comment: '회사 설립일'
                },
                compCEO: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                    comment: '대표이사'
                },
                compIndustry: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                    comment: '업종'
                },
                compLateX: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                    comment: '위도'
                },
                compLateY: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                    comment: '경도'
                },
                compURL: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                    comment: '회사 홈페이지 URL'
                },
                compLotAddr: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                    comment: '지번 주소'
                },
                compAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                    comment: '도로명 주소'
                },
                compMapIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                    comment: '회사 지도 이미지 URL'
                },
                compStatus: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                    comment: '회사 상태 (1: 활성, 0: 비활성)'
                },
                compViewCount: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    comment: '조회수'
                },
                compEmployeeCount: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: '직원 수'
                },
                compCapital: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    comment: '자본금'
                },
                compSales: {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    comment: '매출액'
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
                }
            },
            {
                sequelize,
                modelName: "CompInfo",
                tableName: "tb_comp_info",
                charset: "utf8mb4",
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // CompInfo와 CompBoard 간의 관계 설정
        db.CompInfo.hasMany(db.CompBoard, { 
            foreignKey: "compIdx", 
            sourceKey: "compIdx" 
        });
        
        // CompInfo와 CompStatistics 간의 관계 설정
        db.CompInfo.hasMany(db.CompStatistics, { 
            foreignKey: "compIdx", 
            sourceKey: "compIdx" 
        });
    }
};
