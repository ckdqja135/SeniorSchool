const { ChurchBoard, ChurchInfo } = require('../../model/index');
const createBoardService = require('./boardServiceFactory');

module.exports = createBoardService({
    Model: ChurchBoard,
    modelName: 'churchboard',
    entityIdxField: 'churchIdx',
    requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
    creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'churchIdx', 'boardRegDate', 'boardLike', 'boardHits'],
    updatableFields: ['boardTitle', 'boardContent'],
    hasIsDeleted: false,
    includeEntity: { model: ChurchInfo, as: 'church', attributes: ['churchIdx', 'churchName'] },
});
