var express = require('express');
const router = express.Router();
const { Board } = require('../../model/index');

router.get('/',async (req,res) => {
    try {

        const boards = await Board.findAll();
        return res.status(200).json(boards);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
