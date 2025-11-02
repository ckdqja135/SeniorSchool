const Sequelize = require('sequelize');

module.exports = class CompSalary extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            salaryIdx: {
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
            writerId: {
                type: Sequelize.STRING(45),
                allowNull: false,
                comment: '작성자 ID'
            },
            writerPw: {
                type: Sequelize.STRING(100),
                allowNull: false,
                comment: '작성자 비밀번호'
            },
            salary: {
                type: Sequelize.BIGINT,
                allowNull: false,
                comment: '연봉 (만원 단위)'
            },
            workYear: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: '근무 연차'
            },
            department: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: '직군'
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
            },
            isDeleted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '삭제 여부'
            }
        }, {
            sequelize,
            modelName: "CompSalary",
            tableName: "tb_comp_salary",
            charset: "utf8mb4",
            timestamps: false,
        });
    }

    static associate(db) {
        // CompSalary와 CompInfo 간의 관계 설정
        db.CompSalary.belongsTo(db.CompInfo, { 
            foreignKey: "compIdx", 
            targetKey: "compIdx",
            as: 'company'
        });
    }
};

