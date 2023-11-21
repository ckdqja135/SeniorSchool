var express = require('express');
var router = express.Router();
/* GET home page. */

router.all('/', function(req, res, next) {
    res.render('html/schoolPage', {title: 'SchoolOppa', univ: req.query.name});
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
