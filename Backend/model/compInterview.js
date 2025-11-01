const Sequelize = require('sequelize');

module.exports = class CompInterview extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            interviewIdx: {
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
            interviewTitle: {
                type: Sequelize.STRING(100),
                allowNull: false,
                comment: '면접 후기 제목'
            },
            interviewContent: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: '면접 후기 내용'
            },
            interviewDate: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: '면접 날짜'
            },
            interviewResult: {
                type: Sequelize.STRING(20),
                allowNull: true,
                comment: '면접 결과 (합격, 불합격, 대기중)'
            },
            interviewDifficulty: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: '면접 난이도 (1-5)'
            },
            position: {
                type: Sequelize.STRING(50),
                allowNull: true,
                comment: '지원 직책'
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
            modelName: "CompInterview",
            tableName: "tb_comp_interview",
            charset: "utf8mb4",
            timestamps: false,
        });
    }

    static associate(db) {
        // CompInterview와 CompInfo 간의 관계 설정
        db.CompInterview.belongsTo(db.CompInfo, { 
            foreignKey: "compIdx", 
            targetKey: "compIdx",
            as: 'company'
        });
    }
};

