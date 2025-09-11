const Sequelize = require('sequelize');

module.exports = class CompBoard extends Sequelize.Model {
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
                comment: '게시글 제목'
            },
            boardContent: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: '게시글 내용'
            },
            compIdx: {
                type: Sequelize.BIGINT,
                allowNull: true,
                comment: '회사 인덱스 (외래키)'
            },
            boardRegDate: {
                type: Sequelize.STRING(45),
                allowNull: true,
                comment: '게시글 등록일'
            },
            boardLike: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
                comment: '좋아요 수'
            },
            boardHits: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
                comment: '조회수'
            },
            boardID: {
                type: Sequelize.STRING(45),
                allowNull: false,
                comment: '작성자 ID'
            },
            boardPW: {
                type: Sequelize.STRING(100),
                allowNull: false,
                comment: '작성자 비밀번호'
            },
            boardCategory: {
                type: Sequelize.STRING(20),
                allowNull: true,
                comment: '게시글 카테고리 (후기, 질문, 정보공유 등)'
            },
            isDeleted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '삭제 여부'
            }
        }, {
            sequelize,
            modelName: "CompBoard",
            tableName: "tb_comp_board",
            charset: "utf8mb4",
            timestamps: false,
        });
    }

    static associate(db) {
        // CompBoard와 CompInfo 간의 관계 설정
        db.CompBoard.belongsTo(db.CompInfo, { 
            foreignKey: "compIdx", 
            targetKey: "compIdx",
            as: 'company'
        });
        
        // CompBoard와 CompComment 간의 관계 설정
        db.CompBoard.hasMany(db.CompComment, { 
            foreignKey: "boardIdx", 
            sourceKey: "boardIdx" 
        });
    }
};
