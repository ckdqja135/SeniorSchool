const { UnivBoard } = require('../../model/index');
const createBoardService = require('./boardServiceFactory');

module.exports = createBoardService({
    Model: UnivBoard,
    modelName: 'univboard',
    entityIdxField: 'univIdx',
    requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
    creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'univIdx', 'boardRegDate', 'boardLike', 'boardHits'],
    updatableFields: ['boardTitle', 'boardContent'],
    hasIsDeleted: false,
});
