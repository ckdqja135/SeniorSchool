var express = require('express');
const router = express.Router();
var { Church } = require('../../model/index');
const { Op } = require("sequelize");

router.get('/auto', async (req, res) => {
    try {
        const { keyword } = req.query;
        const decodedKeyword = decodeURIComponent(keyword);

        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const schools = await Church.findAll({
            where: {
                ChurchName: {
                    [Op.not]: '',
                    [Op.like]: `%${keyword}%`,
                },
            },
            limit: 10,
        });
        console.log("seach/auto", decodedKeyword)
        return res.status(200).json(schools);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get('/school', async (req, res) => {
    try {
        const { schoolName } = req.query;

        if (!schoolName) {
            return res.status(400).json({ error: 'schoolName is required' });
        }

        const schoolInfo = await Church.findOne({
            where: {
                ChurchName: {
                    [Op.eq]: schoolName,
                },
            },
        });

        return res.status(200).json(schoolInfo);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;
