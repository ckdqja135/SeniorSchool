var express = require('express');
const router = express.Router();
const { UnivBoard } = require('../../model/index');

router.get('/',async (req,res) => {
    try {
        let univNo = req.query.UnivNo;
        console.log(univNo)
        const boards = await UnivBoard.findAll({
            where: {
                UnivNo: univNo
            }
        });

        return res.status(200).json(boards);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;
