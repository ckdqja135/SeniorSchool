const { CompBoard } = require('../../model/index');
const createBoardService = require('./boardServiceFactory');

module.exports = createBoardService({
    Model: CompBoard,
    modelName: 'compboard',
    entityIdxField: 'compIdx',
    requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
    creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'compIdx', 'boardRegDate', 'boardLike', 'boardHits', 'boardCategory', 'boardRating', 'isDeleted'],
    updatableFields: ['boardTitle', 'boardContent', 'boardCategory', 'boardRating'],
    hasIsDeleted: true,
});
