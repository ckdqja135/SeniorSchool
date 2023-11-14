var express = require('express');
var router = express.Router();
var db_service = require('../services/db_services');
/* GET home page. */

router.all('/:id', function(req, res, next) {
    res.render('html/Board', { title: 'SchoolOppa'});
});
module.exports = router;
