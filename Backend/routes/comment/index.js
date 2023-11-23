var express = require('express');
const router = express.Router();
const { UnivComment } = require('../../model/index');

router.get('/', async (req, res) => {
    try {
        const { boardNo } = req.query;

        if (!boardNo) {
            return res.status(400).json({ error: 'boardNo is required' });
        }

        const comments = await UnivComment.findAll({
            where: {
                BoardNo: boardNo
            }
        });

        return res.status(200).json(comments);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;