const Sequelize = require('sequelize');

module.exports = class CompComment extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            commentIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            boardIdx: {
                type: Sequelize.BIGINT,
                allowNull: false,
                comment: '게시글 인덱스 (외래키)'
            },
            commentLike: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
                comment: '댓글 좋아요 수'
            },
            commentDepth: {
                type: Sequelize.BIGINT,
                allowNull: true,
                comment: '댓글 깊이 (대댓글 구분)'
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
            commentParent: {
                type: Sequelize.BIGINT,
                allowNull: true,
                comment: '부모 댓글 인덱스'
            },
            commentContent: {
                type: Sequelize.STRING(200),
                allowNull: false,
                comment: '댓글 내용'
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
            modelName: "CompComment",
            tableName: "tb_comp_comment",
            charset: "utf8mb4",
            timestamps: false,
        });
    }

    static associate(db) {
        // CompComment와 CompBoard 간의 관계 설정
        db.CompComment.belongsTo(db.CompBoard, { 
            foreignKey: "boardIdx", 
            targetKey: "boardIdx",
            as: 'board'
        });
    }
};
