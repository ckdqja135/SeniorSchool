class db_services {
    constructor () {
        // dbconneciton 
        this.db_connector = require('../conf/db_conn');
        this.dbc = this.db_connector.init(); // db connection
    }

    // 게시글 등록
    async create_board(out, params) {
        let board_SQL = "INSERT INTO board (Church_No, BoardTitle, BoardRegDate, BoardLike, BoardHits, BoardID, BoardPW) VALUES (?, ?, ?, ?, ?, ?, ?);";
        let board_detail_SQL = "INSERT INTO board_detail (boardID, churchNo, boardContent, BoardRegDate, boardTitle, BoardLike, BoardHits, writerId, writerPw) VALUES  (?, ?, ?, ?, ?, ?, ?, ?, ?);";
        // let JOBS_APPLICATION_LANG = "INSERT INTO JOBS_APPLICATION_LANG(JOBS_APPLICATION_SEQ, NAME) VALUES (?, ?);";
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        // console.log("board_detail_SQL", board_detail_SQL)
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작

            let ins_application = await conn.query(board_SQL, [params.church_no, params.board_title, params.board_reg, 
                                                    params.board_like, params.board_hits, params.board_id, params.board_pw]);
            let board_seq = ins_application[0].insertId;
            let ins_application_detail = await conn.query(board_detail_SQL,[board_seq, params.church_no, params.board_content, params.board_reg, params.board_title, params.board_like, params.board_hits, params.board_id, params.board_pw]);
            // const ins_application_lang = await conn.query(JOBS_APPLICATION_LANG, [jobAppSeq, params.name]);
            
            await conn.commit(); // 커밋
            result = ins_application_detail;
            console.log(result)
            out(error, result);
        } catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    
    // 게시글 검색
    async inquiry_board (out, no) {
        let sql = "SELECT * FROM board where Church_No = "+no+"";
        console.log("sql", sql)
        
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let select_board = await conn.query(sql);
            await conn.commit(); // 커밋
            result = select_board[0];
            out(error, result);
        }catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 게시글 상세 페이지 데이터 가져오기
    async get_board_detail (out, no) {
        let sel_sql = "SELECT * FROM board_detail WHERE boardID = "+no+"";
        let upd_sql = "UPDATE board SET BoardHits = BoardHits + 1 WHERE BoardNo = "+no+"";
        let upd_dtail_sql = "UPDATE board_detail SET boardHits = boardHits + 1 WHERE BoardId = "+no+"";
        console.log("sql", upd_sql)
        
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let detail_board = await conn.query(sel_sql);
            await conn.query(upd_sql);
            await conn.query(upd_dtail_sql);
            await conn.commit(); // 커밋
            result = detail_board[0];
            out(error, result);
        }catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 교회 검색
    async search_church (out, name) {
        let sql = "select * from churchinfo where churchname = '"+name+"'";
        console.log("sql", sql)
        
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let select_church = await conn.query(sql);
            await conn.commit(); // 커밋
            result = select_church[0];
            out(error, result);
        }catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 교회 자동 검색
    async auto_search_church (out, keyword) {
        let sql = "select * from churchinfo where churchname != '' AND churchname like '%"+keyword+"%' LIMIT 0, 10";
        console.log("sql", sql)
        
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let select_church = await conn.query(sql);
            await conn.commit(); // 커밋
            result = select_church[0];
            out(error, result);
            console.log("result", result)
        }catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 댓글 Insert.
    async save_comment (out, params) {
        let comment_SQL = "INSERT INTO board_comment (BoardID, CommentDepth, WriterId, WriterPw, Commnetperent, CommentContent, CommentLike) VALUES (?, ?, ?, ?, ?, ?, ?);";
        
        // let JOBS_APPLICATION_LANG = "INSERT INTO JOBS_APPLICATION_LANG(JOBS_APPLICATION_SEQ, NAME) VALUES (?, ?);";
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        let ins_application = "";
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            if (params.depth == 0) {
                ins_application = await conn.query(comment_SQL, [params.board_idx, params.depth, params.comment_writer, 
                                                        params.comment_password, params.parent_id, params.comment_content, params.comment_like]);
            } else if(params.depth == 1) {
                ins_application = await conn.query(comment_SQL, [params.board_idx, params.depth, params.reply_writer, 
                    params.reply_password, params.parent_idx, params.reply_content, params.reply_like]);
            }
            await conn.commit(); // 커밋
            result = ins_application;
            out(error, result);
            console.log("댓글 ins :", result)
        } catch (err) {
            error = "[Error} : " + params.board_idx + "번 게시물의 " + params.comment_writer + "의 유저의 댓글등록이 실패하였습니다.";
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 댓글 조회
    async get_comment (out, idx) {
        let sql = "select * from board_comment where BoardID = "+idx+"";
        console.log("sql", sql)
        
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let select_church = await conn.query(sql);
            await conn.commit(); // 커밋
            result = select_church[0];
            out(error, result);
        }catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 댓글 삭제
    async del_comment (out, params) {
        let sql = "UPDATE board_comment SET CommentContent='작성자가 삭제한 글입니다.' " +
                    "WHERE CommentId = "+params.reply_idx+" AND WriterPw = '"+params.reply_pw+"';";
        console.log("sql", sql)
        
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let update_comment = await conn.query(sql);
            await conn.commit(); // 커밋
            result = update_comment[0];
            out(error, result);
            console.log("result", result)
        }catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 댓글 수정
    async upd_comment (out, params) {
        let sql = "UPDATE board_comment SET CommentContent='"+params.reply_content+"' " +
                    "WHERE CommentId = "+params.reply_idx+" AND WriterPw = '"+params.reply_pw+"';";
        console.log("sql", sql)
        
        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let update_comment = await conn.query(sql);
            await conn.commit(); // 커밋
            result = update_comment[0];
            out(error, result);
            console.log("result", result)
        }catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 게시판 수정
    async correct_borad (out, params) {
        let sql = "UPDATE board_detail SET boardContent='"+params.board_content+"' " +
                "WHERE boardID = "+params.board_id+" AND writerPw = '"+params.writer_password+"';";
        console.log("sql", sql)

        let conn =  await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let update_comment = await conn.query(sql);
            await conn.commit(); // 커밋
            result = update_comment[0];
            out(error, result);
            console.log("result", result)
        }catch (err) {
            error = err;
            console.log(err)
            out(error, result);
            await conn.rollback() // 롤백
            // return res.status(500).json(err)
        } finally {
            conn.release() // con 회수
        }
    }

    // 게시글 삭제하기.
    async delete_borad(out, params) {
        console.log("params", params);
        let sql = "SELECT * FROM board_detail WHERE boardId = " + params.board_idx + "";
        let board_delete_sql = "DELETE FROM board WHERE BoardNo = " + params.board_idx + " AND Church_No = ?";
        let borad_detail_delete_sql = "DELETE FROM board_detail " +
            "WHERE boardId = " + params.board_idx + " AND WriterPw = '" + params.writer_password + "';";
    
        let board_comment_del_sql = "DELETE FROM board_comment WHERE BoardID = " + params.board_idx + "";
        console.log("sql", board_delete_sql);
        console.log("sql", board_comment_del_sql);
    
        let conn = await this.dbc.getConnection();
        let result = null;
        let error = null;
        try {
            await conn.beginTransaction(); // 트랜잭션 적용 시작
            let select_result = await conn.query(sql);
            // borad_detail_delete_sql 쿼리 실행
            let detail_delete_result = await conn.query(borad_detail_delete_sql);

            if (detail_delete_result[0].affectedRows > 0) {
                // borad_detail_delete_sql 영향을 받은 행이 있다면 board_delete_sql 쿼리 실행
                result = await conn.query(board_delete_sql, select_result[0][0].churchNo);
                await conn.query(board_comment_del_sql);
                await conn.commit(); // 커밋
                out(error, detail_delete_result);
            } else {
                out("No rows affected by borad_detail_delete_sql", detail_delete_result);
            }
            console.log("result", result);
            
        } catch (err) {
            error = err;
            console.log(err);
            out(error, result);
            await conn.rollback(); // 롤백
        } finally {
            conn.release(); // con 회수
        }
    }
}

module.exports = new db_services();