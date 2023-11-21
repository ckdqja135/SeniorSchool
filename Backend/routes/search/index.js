var express = require('express');
const router = express.Router();
const { University } = require('../../model/index');
const { Op } = require("sequelize");

router.get('/auto', async (req, res) => {
    try {
        const { keyword } = req.query;
        const decodedKeyword = decodeURIComponent(keyword);

        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const schools = await University.findAll({
            attributes: ['UnivName', 'UnivLocate'],
            where: {
                UnivName: {
                    [Op.not]: '',
                    [Op.like]: `%${decodedKeyword}%`,
                },
            },
            limit: 10,
        });

        console.log("schools ", schools)

        return res.status(200).json(schools);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get('/school', async (req, res) => {
    try {
        const { univName } = req.query;
        const decodedKeyword = decodeURIComponent(univName);

        if (!univName) {
            return res.status(400).json({ error: 'schoolName is required' });
        }

        const schoolInfo = await University.findOne({
            where: {
                UnivName: {
                    [Op.eq]: decodedKeyword,
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
