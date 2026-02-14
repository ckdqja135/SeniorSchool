const { RestaurantBoard } = require('../../model/index');
const createBoardService = require('./boardServiceFactory');

module.exports = createBoardService({
    Model: RestaurantBoard,
    modelName: 'restaurantboard',
    entityIdxField: 'restaurantIdx',
    requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
    creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'restaurantIdx', 'boardRegDate', 'boardLike', 'boardHits', 'boardRating'],
    updatableFields: ['boardTitle', 'boardContent', 'boardRating'],
    hasIsDeleted: false,
});
