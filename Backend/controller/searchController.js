const searchService = require('../service/searchService');

exports.autoComplete = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const decodedKeyword = decodeURIComponent(keyword);
        const schools = await searchService.autoComplete(decodedKeyword);

        return res.status(200).json(schools);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getSchoolInfo = async (req, res) => {
    try {
        const { univName } = req.query;

        if (!univName) {
            return res.status(400).json({ error: 'univName is required' });
        }

        const decodedUnivName = decodeURIComponent(univName);
        const schoolInfo = await searchService.getSchoolInfo(decodedUnivName);

        return res.status(200).json(schoolInfo);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};