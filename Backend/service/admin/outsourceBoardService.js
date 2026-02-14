const { OutsourceBoard, OutsourceInfo } = require('../../model/index');
const createBoardService = require('./boardServiceFactory');

module.exports = createBoardService({
    Model: OutsourceBoard,
    modelName: 'outsourceboard',
    entityIdxField: 'outsourceIdx',
    requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
    creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'outsourceIdx', 'boardRegDate', 'boardLike', 'boardHits'],
    updatableFields: ['boardTitle', 'boardContent'],
    hasIsDeleted: false,
    includeEntity: { model: OutsourceInfo, as: 'outsource', attributes: ['outsourceIdx', 'outsourceName'] },
});
