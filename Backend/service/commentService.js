const { UnivComment, sequelize } = require('../model/index');

exports.getComments = async (boardNo) => {
    return await UnivComment.findAll({
        where: {
            BoardNo: boardNo
        }
    });
};

exports.insertComment = async (commentData) => {
    const transaction = await sequelize.transaction();

    try {
        await UnivComment.create({
            BoardNo: commentData.boardNo,
            CommentDepth: commentData.depth,
            WriterId: commentData.commentWriter,
            WriterPw: commentData.commentPw,
            CommnetPerent: commentData.parentId,
            CommentContent: commentData.commentContent,
            CommentLike: commentData.commentLike
        }, { transaction });

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

exports.modifyComment = async ({ replyPw, commentNo, commentContent }) => {
    const [updateCount] = await UnivComment.update(
        { CommentContent: commentContent },
        {
            where: {
                CommentId: commentNo,
                WriterPw: replyPw
            }
        }
    );

    return updateCount > 0;
};

exports.deleteComment = async ({ commentPw, commentNo }) => {
    const [updateCount] = await UnivComment.update(
        { CommentContent: '작성자가 삭제한 글입니다.' },
        {
            where: {
                CommentId: commentNo,
                WriterPw: commentPw
            }
        }
    );

    return updateCount > 0;
};