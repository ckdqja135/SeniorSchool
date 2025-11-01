const express = require('express');
const router = express.Router();
const compController = require('../controller/compController');

// 회사 조회수 기준 인기 회사 TOP10 조회
router.get('/top-viewed', compController.getTopViewedCompanies);

// 회사 추가 요청 생성
router.post('/requests', compController.createCompRequest);

// ========== 면접 후기 관련 API ==========
// 면접 후기 목록 조회 (선택: compIdx 쿼리 파라미터로 특정 회사 필터링)
router.get('/interviews', compController.getInterviews);
// 면접 후기 상세 조회
router.get('/interviews/:interviewIdx', compController.getInterviewDetail);
// 면접 후기 작성
router.post('/interviews', compController.createInterview);
// 면접 후기 수정
router.put('/interviews/:interviewIdx', compController.updateInterview);
// 면접 후기 삭제
router.delete('/interviews/:interviewIdx', compController.deleteInterview);

// ========== 연봉 후기 관련 API ==========
// 연봉 후기 목록 조회 (선택: compIdx 쿼리 파라미터로 특정 회사 필터링)
router.get('/salaries', compController.getSalaries);
// 연봉 후기 작성
router.post('/salaries', compController.createSalary);

module.exports = router;
