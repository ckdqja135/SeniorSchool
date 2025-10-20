const Sequelize = require('sequelize');

module.exports = class FreeBoardComment extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            commentIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                comment: '댓글 인덱스'
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
                allowNull: false,
                defaultValue: 0,
                comment: '댓글 깊이 (0: 댓글, 1: 대댓글)'
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
                comment: '부모 댓글 인덱스 (대댓글인 경우)'
            },
            commentContent: {
                type: Sequelize.TEXT,
                allowNull: false,
                comment: '댓글 내용'
            },
            commentRegDate: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                comment: '댓글 등록일'
            },
            commentModDate: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: '댓글 수정일'
            },
            isDeleted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '삭제 여부'
            }
        }, {
            sequelize,
            modelName: "FreeBoardComment",
            tableName: "tb_freeboard_comment",
            charset: "utf8mb4",
            timestamps: false,
        });
    }

    static associate(db) {
        // FreeBoardComment와 FreeBoard 간의 관계 설정
        db.FreeBoardComment.belongsTo(db.FreeBoard, { 
            foreignKey: "boardIdx", 
            targetKey: "boardIdx",
            as: 'board'
        });
        
        // 대댓글 관계 설정 (자기 참조)
        db.FreeBoardComment.belongsTo(db.FreeBoardComment, {
            foreignKey: "commentParent",
            targetKey: "commentIdx",
            as: 'parentComment'
        });
        
        db.FreeBoardComment.hasMany(db.FreeBoardComment, {
            foreignKey: "commentParent",
            sourceKey: "commentIdx",
            as: 'replies'
        });
    }
};
