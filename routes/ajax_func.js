var express = require('express');
var router = express.Router();


// 라우터 모듈로 들어오는 POST 요청에 대한 처리를 정의.
router.post('/', function(req, res, next) {
  // db_services 모듈 불러오기
  var db_service = require('../services/db_services');

  // 요청된 URL에서 function 이름을 수동으로 추출.
  // req.baseUrl은 현재 라우터의 기본 URL을 나타내며, 마지막 "/" 다음에 위치하는 문자열을 가져온다.
  var func_name = req.baseUrl.substring(req.baseUrl.lastIndexOf("/") + 1);

  // 수동으로 추출한 function 이름을 출력.
  console.log("func_name", func_name)

  // 처리 결과를 반환하는 함수를 정의.
  var out_func = function (error, result) {
    // 오류가 있는 경우에는 오류를 처리하고 출력.
    if (error) {
      // 오류 시 log 출력.
      console.log("error", error);
    }

    // 처리 결과를 JSON 형태로 응답.
    res.json(result);
  }

  // 추출한 function 이름에 따라 다른 동작을 수행.
  if (func_name == 'search') {  
    db_service.search_church(out_func, req.body.church_name);
  } 
  else if (func_name == 'auto') {
    db_service.auto_search_church(out_func, req.body.keyword);
  } 
  else if (func_name == 'inquiry_board') {
    db_service.inquiry_board(out_func, req.body.church_no)
    // db_service.search_church(out_func, "새지음교회");
  } 
  
  else if (func_name == 'create_board') {
    db_service.create_board(out_func, req.body)
    // db_service.search_church(out_func, "새지음교회");
  } 
  
  else if (func_name == 'board_detail') {
    db_service.get_board_detail(out_func, req.body.board_no)
  } 
  
  else if (func_name == 'board_comment') {
    db_service.save_comment(out_func, req.body)
  } 
  
  else if (func_name == 'get_board_comment') {
    db_service.get_comment(out_func, Number(req.body.board_idx));
  }
  
  else if (func_name == 'delete_comment') {
    db_service.del_comment(out_func, req.body);
  }
  
  else if (func_name == 'correct_comments') {
    db_service.upd_comment(out_func, req.body);
    console.log("req.body", req.body)
  }
  
  else if (func_name == 'correct_borad') {
    db_service.correct_borad(out_func, req.body);
  } 
  
  else if (func_name == 'delete_board') {
    console.log("church_idx", req)
    db_service.delete_borad(out_func, req.body);
  }

  else if (func_name == 'nested_comment') {
    console.log("nested_comment", req.body)
    db_service.save_comment(out_func, req.body)
  }
  
  else {
    // 일치하는 함수가 없는 경우 null을 응답.
    res.json(null);
  } 
});
module.exports = router;


