const { RestaurantBoard, RestaurantComment, RestaurantInfo } = require('../../model/index');
const createBoardService = require('./boardServiceFactory');
const logger = require('../../utils/logger');

const baseService = createBoardService({
    Model: RestaurantBoard,
    modelName: 'restaurantboard',
    entityIdxField: 'restaurantIdx',
    requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
    creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'restaurantIdx', 'boardRegDate', 'boardLike', 'boardHits', 'boardRating'],
    updatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardRating'],
    hasIsDeleted: false,
    includeEntity: { model: RestaurantInfo, as: 'restaurant', attributes: ['restaurantIdx', 'restaurantName'] },
});

module.exports = {
    ...baseService,
    deletePost: async (boardIdx) => {
        try {
            const post = await RestaurantBoard.findByPk(boardIdx);
            if (!post) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            await RestaurantComment.destroy({ where: { boardIdx } });
            await RestaurantBoard.destroy({ where: { boardIdx } });

            logger.info(`[admin.restaurantboard.delete] boardIdx=${boardIdx}`);
            return { status: 200, message: '게시글이 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[admin.restaurantboard.delete] Error: ${error.message}`);
            throw error;
        }
    }
};
