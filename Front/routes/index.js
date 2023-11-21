var express = require('express');
var router = express.Router();
var db_service = require('../services/db_services');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('html/index');
});

// router.get('search=?', function(req, res) {

// });

module.exports = router;
