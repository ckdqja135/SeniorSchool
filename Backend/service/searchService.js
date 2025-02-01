const { University } = require('..//model/index');
const { Op } = require('sequelize');

exports.autoComplete = async (keyword) => {
    return await University.findAll({
        attributes: ['UnivName', 'UnivLocate'],
        where: {
            UnivName: {
                [Op.not]: '',
                [Op.like]: `%${keyword}%`,
            },
        },
    });
};

exports.getSchoolInfo = async (univName) => {
    return await University.findOne({
        where: {
            UnivName: {
                [Op.eq]: univName,
            },
        },
    });
};