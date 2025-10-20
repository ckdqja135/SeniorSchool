const Sequelize = require('sequelize');

module.exports = class FreeBoard extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            boardIdx: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                comment: '게시글 인덱스'
            },
            boardTitle: {
                type: Sequelize.STRING(200),
                allowNull: false,
                comment: '게시글 제목'
            },
            boardContent: {
                type: Sequelize.TEXT,
                allowNull: false,
                comment: '게시글 내용'
            },
            boardRegDate: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                comment: '게시글 등록일'
            },
            boardModDate: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: '게시글 수정일'
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
            category: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: '카테고리'
            },
            tags: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: '태그 (JSON 배열)'
            },
            isDeleted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '삭제 여부'
            }
        }, {
            sequelize,
            modelName: "FreeBoard",
            tableName: "tb_freeboard",
            charset: "utf8mb4",
            timestamps: false,
        });
    }

    static associate(db) {
        // FreeBoard와 FreeBoardComment 간의 관계 설정
        db.FreeBoard.hasMany(db.FreeBoardComment, { 
            foreignKey: "boardIdx", 
            sourceKey: "boardIdx",
            as: 'comments'
        });
    }
};
