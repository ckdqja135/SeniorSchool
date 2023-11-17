var express = require('express');
var router = express.Router();
var db_service = require('../services/db_services');
/* GET home page. */

router.all('/', function(req, res, next) {
    console.log("req", req.query.name )
    res.render('html/schoolPage', { title: 'SchoolOppa', church : req.query.name });
});


// router.all('/name=?', function(req, res) {
//     console.log("req", req)
//     res.render('html/churchpage', { title: 'ChurchOppa', church : req.query.name});
// })

// router.get('/search=?', function(req, res) {
//     console.log("req", req.body)
//     res.render('html/churchpage', {title: 'ChurchOppa',  church : req.body});
// })

module.exports = router; 
