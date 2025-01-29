(function (window) {
    const backendPort = 3000; // 백엔드 포트
    const backendURL = `${window.location.protocol}//${window.location.hostname}:${backendPort}`;

    $(document).ready(function(){
        get_board();
    });
        
    var reply_count = 0; //원래 DB에 저장하고 저장 아이디 번호를 넘겨줘야 하는데 DB 없이 댓글 소스만 있어 DB 에서 아이디 증가하는것처럼 스크립트에서 순번을 생성
    var status = false; //수정과 대댓글을 동시에 적용 못하도록
        //댓글 수정 취소
        $(document).on("click","button[name='reply_modify_cancel']", function(){
            //원래 데이터를 가져온다.
            var r_type = $(this).attr("r_type");
            var r_content = $(this).attr("r_content");
            var r_writer = $(this).attr("r_writer");
            var reply_id = $(this).attr("reply_id");
            var reply;

            //자기 위에 기존 댓글 적고 
            if(r_type=="main"){
                reply = 
                    '<tr reply_type="main">'+
                    '   <td width="820px">'+
                    r_content+
                    '   </td>'+
                    '   <td width="100px">'+
                    r_writer+
                    '   </td>'+
                    '   <td width="100px">'+
                    '       <input type="password" id="reply_password_'+reply_id+'" style="width:100px;" maxlength="10" placeholder="패스워드"/>'+
                    '   </td>'+
                    '   <td align="center">'+
                    '       <button name="reply_reply" reply_id = "'+reply_id+'">댓글</button>'+
                    '       <button name="reply_modify" r_type = "main" reply_id = "'+reply_id+'">수정</button>'+
                    '       <button name="reply_del" reply_id = "'+reply_id+'">삭제</button>'+
                    '   </td>'+
                    '</tr>';
            }else{
                reply = 
                    '<tr reply_type="sub">'+
                    '   <td width="820px"> → '+
                    r_content+
                    '   </td>'+
                    '   <td width="100px">'+
                    r_writer+
                    '   </td>'+
                    '   <td width="100px">'+
                    '       <input type="password" id="reply_password_'+reply_id+'" style="width:100px;" maxlength="10" placeholder="패스워드"/>'+
                    '   </td>'+
                    '   <td align="center">'+
                    '       <button name="reply_modify" r_type = "sub" reply_id = "'+reply_id+'">수정</button>'+
                    '       <button name="reply_del" reply_id = "'+reply_id+'">삭제</button>'+
                    '   </td>'+
                    '</tr>';
            }
            
            var prevTr = $(this).parent().parent();
            //자기 위에 붙이기
            prevTr.after(reply);
            //자기 자신 삭제
            $(this).parent().parent().remove(); 
            status = false;
        });

        // 삭제 버튼 클릭 시 이벤트
        $(document).on("click","button[name='reply_del']", function (){
            comment_idx = $(this).attr("reply_id");
            comment_pw = "reply_password_"+comment_idx;
            delete_comment_show_event(comment_idx);
        });

        //대댓글 입력창
        $(document).on("click","button[name='reply_reply']",function(){ //동적 이벤트
            if(status){
                alert("열린 대댓글창을 닫아 주시기 바랍니다.");
                return false;
            }

            status = true;
            $("#reply_add").remove();
            var reply_id = $(this).attr("reply_id");
            var last_check = false;//마지막 tr 체크

            //입력받는 창 등록
            var replyEditor = 
                '<tr id="reply_add" class="reply_reply">'+
                '   <td width="820px">'+
                '       <textarea name="reply_reply_content" id="reply_reply_content" rows="3" cols="50" maxlength="100" placeholder="최대 100자까지 작성가능."></textarea>'+
                '   </td>'+
                '   <td width="100px">'+
                '       <input type="text" name="reply_reply_writer" style="width:100%;" maxlength="10" placeholder="작성자"/>'+
                '   </td>'+
                '   <td width="100px">'+
                '       <input type="password" name="reply_reply_password" style="width:100%;" maxlength="10" placeholder="패스워드"/>'+
                '   </td>'+
                '   <td align="center">'+
                '       <button name="reply_reply_save" type="button" class="btn btn-dark" r_type="main" reply_id="'+reply_id+'" id="mod_'+reply_id+'">등록</button>'+
                '       <button name="reply_reply_cancel" type="button" class="btn btn-success" reply_id="'+reply_id+'" id="del_'+reply_id+'">취소</button>'+
                '   </td>'+
                '</tr>';

            var prevTr = $(this).parent().parent().next();

            //부모의 부모 다음이 sub이면 마지막 sub 뒤에 붙인다.
            //마지막 리플 처리
            if(prevTr.attr("reply_type") == undefined){
                prevTr = $(this).parent().parent();
            }else{
                while(prevTr.attr("reply_type")=="sub"){//댓글의 다음이 sub면 계속 넘어감
                    prevTr = prevTr.next();
                }
                if(prevTr.attr("reply_type") == undefined){//next뒤에 tr이 없다면 마지막이라는 표시를 해주자
                    last_check = true;
                }else{
                    prevTr = prevTr.prev();
                }
            }

            if(last_check){//마지막이라면 제일 마지막 tr 뒤에 댓글 입력을 붙인다.
                $('#reply_area tr:last').after(replyEditor);    
            }else{
                prevTr.after(replyEditor);
            }
        });

        //대댓글 등록
        $(document).on("click","button[name='reply_reply_save']",function(){
            event.stopPropagation();
            var reply_reply_writer = $("input[name='reply_reply_writer']");
            var reply_reply_password = $("input[name='reply_reply_password']");
            var reply_reply_content = $("textarea[name='reply_reply_content']");
            var reply_reply_content_val = reply_reply_content.val().replace("\n", "<br>"); //개행처리
            
            // null 검사
            if(reply_reply_writer.val().trim() == ""){
                alert("이름을 입력하세요.");
                reply_reply_writer.focus();
                return false;
            }

            if(reply_reply_password.val().trim() == ""){
                alert("패스워드를 입력하세요.");
                reply_reply_password.focus();
                return false;
            }

            if(reply_reply_content.val().trim() == ""){
                alert("내용을 입력하세요.");
                reply_reply_content.focus();
                return false;
            }

            //값 셋팅
            var objParams = {
                boardNo           : window.location.href.split('/')[4],
                parentId         : $(this).attr("reply_id"),
                depth             : 1,
                commentWriter     : reply_reply_writer.val(),
                commentPw         : sha256(reply_reply_password.val().trim()),
                commentContent    : reply_reply_content_val,
                commentLike       : 0
            };

            var reply_id;

            $.ajax({
                url         :   backendURL + "/comment/insert",
                type        :   "post",
                data        :   objParams,
                success     :   function(result){
                if(result.success === true) {
                    console.log(result)
                    reply_id = result.insertId; 
    
                var reply_area = $("#reply_area");
                var reply = 
                    '<tr reply_type="sub">'+
                    '   <td width="820px"> → '+
                    reply_reply_content_val+
                    '   </td>'+
                    '   <td width="100px">'+
                    reply_reply_writer.val()+
                    '   </td>'+
                    '   <td width="100px">'+
                    '       <input type="password" id="reply_reply_password" style="width:100px;" maxlength="10" placeholder="패스워드"/>'+
                    '   </td>'+
                    '   <td align="center">'+
                    '       <button name="reply_modify" type="button" class="btn btn-warning" r_type="main" reply_id="'+result.parent_idx+'" id="mod_'+result.parent_idx+'">수정</button>'+
                    '       <button name="reply_del" type="button" class="btn btn-danger" reply_id="'+result.parent_idx+'" id="del_'+result.parent_idx+'">삭제</button>'+
                    '   </td>'+
                    '</tr>';
    
                    if($('#reply_area').contents().size()==0){
                        reply_area.append(reply);
                    } else {
                        $('#reply_area tr:last').after(reply);
                    }
    
                    //댓글 초기화
                    reply_reply_writer.val("");
                    reply_reply_content.val("");
                    $(`#reply_reply_password${result.parentId}`).hide();
                    $(`#delete_btn_${result.parentId}`).hide();
                    $(`#cancel_btn_${result.parentId}`).hide();
                    $(`#modify_btn_${result.parentId}`).hide();
                    $("#reply_reply_password").hide();
                    $("#reply_add").remove();
                }
            },
                error       :   function(request, status, error){
                    console.log("AJAX_ERROR");
                }
            });
        });

        //대댓글 입력창 취소
        $(document).on("click","button[name='reply_reply_cancel']",function(){
            $("#reply_add").remove();
            status = false;
        });

        // 댓글 index
        var comment_idx;
        // 작성자 비밀번호
        var comment_pw;

    //댓글 삭제
    function del_comment(comment_id) {
        //패스워드와 인덱스 넘겨 삭제를 한다.
        //값 셋팅
        var objParams = {
                commentPw         : sha256($(`#reply_password_${comment_id}`).val().trim()),
                commentNo         : comment_idx
        };

        if($(`#reply_password_${comment_id}`).val().trim() == '') {
            jQuery.noConflict();
            $('#nullModal').modal('show');
        } else {
            //ajax 호출
            $.ajax({
                url         :   backendURL + "/comment/delete",
                type        :   "put",
                data        :   objParams,
                success     :   function(result){
                    if(result.success === true) {
                        jQuery.noConflict();
                        $('#confirmModal').modal('hide');
                        $('#DeleteModal').modal('show');
                    } else {
                        jQuery.noConflict();
                        $('#confirmModal').modal('hide');
                        $('#FailModal').modal('show');
                    }
                },
                error       :   function(request, status, error){
                    console.log("AJAX_ERROR");
                }
            });
        }
    }

    //댓글 수정 저장
    $(document).on("click","button[name='reply_modify']", function(){
        comment_idx = $(this).attr("reply_id");
        modify_form_show(comment_idx);
    });

    // 댓글 수정 함수
    function correct_comments(commentIdx) {
        // var reply_idx = $(this).attr("reply_id");
        var rType = $(this).attr("r_type");
        var replyPw = sha256($(`#reply_password_${commentIdx}`).val().trim());
        var commentContent = $(`#comment_content_${commentIdx}`).val();

        if(rType=="main"){
            parent_id = "0";
            depth = "0";
        }else{
            parent_id = $(this).attr("reply_id");
            depth = "1";
        }

        if(status){
            alert("수정과 대댓글은 동시에 불가합니다.");
            return false;
        }

        //패스워드와 아이디를 넘겨 패스워드 확인
        //값 셋팅
        var objParams = {
            replyPw        : replyPw,
            commentNo       : commentIdx,
            commentContent   : commentContent
        };

        if($(`#reply_password_${commentIdx}`).val().trim() == '') {
            jQuery.noConflict();
            $('#nullModal').modal('show');
        } else {
            //ajax 호출
            $.ajax({
                url         :   backendURL + "/comment/modify",
                type        :   "put",
                data        :   objParams,
                success     :   function(result){
                    if (result.success === true) {
                        console.log(result)
                        jQuery.noConflict();
                        $('#confirmModal').modal('hide');
                        $('#correctModal').modal('show');
                        $(`#comment_content_${commentIdx}`).attr('readonly', true);
                        $(`#reply_password_${commentIdx}`).hide();
                        $(`#modify_btn_${commentIdx}`).hide();
                        $(`#cancel_btn_${commentIdx}`).hide();
                    } else {
                        jQuery.noConflict();
                        $('#confirmModal').modal('hide');
                        $('#FailModal').modal('show');
                    }
                },
                error       :   function(request, status, error){
                    console.log("AJAX_ERROR", request, status, error);
                }
            });
        }
    }
        
    // 게시판 상세조회.
    function get_board() {
        var boardNo = window.location.href.split('/')[4];

        // Fetch 통신 시작
        fetch(backendURL + '/board/detail?boardNo=' + boardNo, {
            method: 'GET',
        })
            .then(response => response.json()) // 응답 데이터를 JSON으로 파싱
            .then(result => {
                let boardBody = $(".modal-body");
                if (result) {
                    var str = `
                    <h2 class="board_title"> ${result.BoardTitle} </h2>
                    <h2 class="hits"> ${result.BoardHits}</h2>
        
                    <div class="form-group">
                        <div class="input-group" style="display:none">
                            <span class="input-group-text">비밀번호 입력</span> 
                            <form><input type="password" class="form-control" id="writer_pw" autoComplete="off"></form>
                        </div>
        
                        <button type="button" class="btn btn-primary float-right" id="cancel_btn" onclick="correct_cancel_event()" style="margin:10px; display:none">취소</button>
                        <button type="button" class="btn btn-primary float-right" id="correct_btn" onclick="correct_borad_event();" style="margin:10px; display:none">수정</button>
                        <button type="button" class="btn btn-primary float-right" id="delete_btn" onclick="delete_confirm();" style="margin:10px; display:none">삭제</button>
                        <textarea type="text" class="board-form-control" id="board-content" readonly="true">${result.BoardContent}</textarea> 
                        <label for="message-text" class="write_id" id="writer_id">${result.WriterId}</label>
                        <br />
                        <h7 class="reg_date">${result.BoardRegDate}</h7>
                    </div>
                    `
                }
                boardBody.append(str);
                get_board_comment(boardNo);
            })
            .catch(error => {
                console.error('Fetch Error:', error);
            });
    }
    
    /**
     * fuction : 게시글의 댓글들을 조회하는 함수.
     * */
    function get_board_comment(boardNo) {
        fetch(backendURL + '/comment/?boardNo=' + boardNo, {
            method: 'GET', // Use the GET method
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                // 응답이 성공적인지 확인
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                }
                // JSON 형태로 된 응답 데이터를 추출하여 반환
                return response.json();
            })
            .then(result => {
                // 성공적으로 JSON 데이터를 받아 처리한 후 실행됨
                var comments = build_comment_hierarchy(result); // 계층적인 댓글 구조를 생성

                display_comments(comments); // 댓글을 화면에 표시
            })
            .catch(error => {
                // 네트워크 요청이 실패하거나 처리 과정에서 오류가 발생한 경우 실행됨
                console.error('Fetch error:', error);
            });
    }



    // 계층적인 댓글 구조 생성 함수
    function build_comment_hierarchy(comments) {
        // 댓글을 ID를 기준으로 매핑할 객체
        const commentMap = {};
        // 모든 댓글을 commentMap에 추가하고 부모-자식 관계 설정

        comments.forEach(comment => {
            // children 배열 생성
            comment.children = [];
            // commentMap에 댓글 추가

            commentMap[comment.CommentId] = comment;
            // 부모 댓글이 있는 경우, 부모 댓글의 children 배열에 자신 추가
            if (comment.CommentDepth !== "0") {
                const parentComment = commentMap[comment.CommnetPerent];
                if (parentComment) {

                    parentComment.children.push(comment);
                }
            }
        });
        const rootComments = [];

        // 최상위 댓글 찾기
        comments.forEach(comment => {
            if (comment.CommentDepth === 0) {
                rootComments.push(comment);
            }
        });

        return rootComments;
    }
    
      // 댓글 조회 함수
    function display_comments(comments) {
        for (var i = 0; i < comments.length; i++) {
            // 현재 순회중인 댓글 객체
            let comment = comments[i];
            // 댓글의 HTML 코드를 저장할 변수
            let commentHTML = '';
        // 댓글의 깊이가 0일 경우
        if (comment.CommentDepth === 0) {
            commentHTML += `<tr reply_type="main">
                                <td width="800px" style="word-break:break-all">
                                    <textarea type="text" class="comment-form-control" id="comment_content_${comment.CommentId}" readonly="true">${comment.CommentContent}</textarea>
                            </td>
                            <td width="100px">
                                ${comment.WriterId}
                            </td>`
            commentHTML += `<td width="200px">
                                <input type="password" id="reply_password_${comment.CommentId}" style="width:100px;" maxlength="10" placeholder="패스워드" autoComplete="off"/></form>
                                <button type="button" class="btn btn-danger" id="delete_btn_${comment.CommentId}" onclick="del_comment(${comment.CommentId});">삭제</button>
                                <button type="button" class="btn btn-warning" id="modify_btn_${comment.CommentId}" onclick="correct_comments(${comment.CommentId});">수정</button>
                                <button type="button" class="btn btn-success" id="cancel_btn_${comment.CommentId}" onclick="comment_cancel_event(${comment.CommentId});">취소</button>
                            </td>`
            commentHTML += `<td width="300px">
                                <button name="reply_reply" type="button" class="btn btn-primary" reply_id="${comment.CommentId}" id="comment_${comment.CommentId}">댓글</button>
                                <button name="reply_modify" type="button" class="btn btn-warning" r_type="main" reply_id="${comment.CommentId}" id="mod_${comment.CommentId}">수정</button>
                                <button name="reply_del" type="button" class="btn btn-danger" reply_id="${comment.CommentId}" id="del_${comment.CommentId}">삭제</button>
                            </td>
                            </tr>;`
            }
            // 댓글의 깊이가 1일 경우 (대댓글)
            if (comment.CommentDepth === 1) {
                commentHTML += `<tr reply_type="sub">
                                    <td width="820px"> →
                                        <textarea type="text" class="comment-form-control" id="reply_reply_content_${comment.CommentId}" readonly="true">${comment.CommentContent}</textarea>
                                    </td>

                                    <td width="100px">
                                        ${comment.WriterId}
                                    </td>

                                    <td width="100px">
                                        <input type="password" id="sub_reply_password_${comment.CommentId}" style="width:100px;" maxlength="10" autoComplete="off" placeholder="패스워드"/>
                                    </td>

                                   
                                </tr>`;
                // <td width="300px">
                //     <button name="reply_modify" type="button" className="btn btn-warning" r_type="main"
                //             reply_id="${comment.CommentId}" id="mod_sub_reply_${comment.CommentId}"
                //             onClick="modify_sub_reply_form_show(${comment.CommentId})">수정
                //     </button>
                //     <button name="reply_del" type="button" className="btn btn-danger" reply_id="${comment.CommentId}"
                //             id="del_sub_${comment.CommentId}">삭제
                //     </button>
                // </td>
            }

            if ($('#reply_area').contents().size() == 0) {
                $('#reply_area').append(commentHTML);
            } else {
                $('#reply_area tr:last').after(commentHTML);
            }
            // 댓글
            $(`#reply_password_${comment.CommentId}`).hide();
            $(`#delete_btn_${comment.CommentId}`).hide();
            $(`#cancel_btn_${comment.CommentId}`).hide();
            $(`#modify_btn_${comment.CommentId}`).hide();

            // 대댓글
            $(`#sub_reply_password_${comment.CommentId}`).hide();

            // 댓글 삭제 처리.
            if ($(`#comment_content_${comment.CommentId}`).val() == '작성자가 삭제한 글입니다.') {
                $(`#comment_${comment.CommentId}`).attr("disabled", true);
                $(`#mod_${comment.CommentId}`).attr("disabled", true);
                $(`#del_${comment.CommentId}`).attr("disabled", true);
            }

            if (comment.children.length > 0) {
                display_comments(comment.children); // 재귀적으로 자식 댓글 표시
            }
        }
    }

    //댓글 등록.
    function insert_comment () {
            //null 검사
            if($("#reply_writer").val().trim() == ""){
                alert("이름을 입력하세요.");
                $("#reply_writer").focus();
                return false;
            }
            
            if($("#reply_password").val().trim() == ""){
                alert("패스워드를 입력하세요.");
                $("#reply_password").focus();
                return false;
            }

            if($("#reply_content").val().trim() == ""){
                alert("내용을 입력하세요.");
                $("#reply_content").focus();
                return false;
            }

            //개행처리
            let commentContent = $("#reply_content").val().replace("\n", "<br>");
            // 댓글 id
            let comment_id;
            
            //값 셋팅
            let objParams = {
                boardNo          : window.location.href.split('/')[4],
                parentId         : 0,
                depth            : 0,
                commentWriter    : $("#reply_writer").val().trim(),
                commentPw        : sha256($("#reply_password").val().trim()),
                commentContent   : commentContent,
                commentLike      : 0
            };

            $.ajax({
            url         :   backendURL + "/comment/insert",
            type        :   "post",
            data        :   objParams,
            success     :   function(result){
            if(result.success === true) {
                console.log(result)
                commentId = result.insertId;
            let commentArea = $("#reply_area");
            let comment = 
                `<tr reply_type="main">
                    <td width="800px" style="word-break:break-all">
                        ${commentContent}
                    </td>
                    <td width="100px">
                        ${$("#reply_writer").val()}
                    </td>
                    <td width="100px">
                        <form>
                            <input type="password" id="reply_password_${commentId}" style="width:100px;" maxlength="10" placeholder="패스워드" autoComplete="off"/>
                        </form>
                        <button type="button" class="btn btn-danger" id="delete_btn_${commentId}" onclick="del_comment(${commentId});">삭제</button>
                        <button type="button" class="btn btn-warning" id="modify_btn_${commentId}" onclick="correct_comments(${commentId});">수정</button>
                        <button type="button" class="btn btn-success" id="cancel_btn_${commentId}" onclick="comment_cancel_event(${commentId});">취소</button>
                    </td>
                    <td width="300px">
                        <button name="reply_reply" type="button" class="btn btn-primary" reply_id="${commentId}" id="comment_${commentId}">댓글</button>
                        <button name="reply_modify" type="button" class="btn btn-warning" r_type="main" reply_id="${commentId}" id="mod_${commentId}">수정</button>
                        <button name="reply_del" type="button" class="btn btn-danger" reply_id="${commentId}" onclick="delete_comment_show_event();" id="del_${commentId}">삭제</button>
                    </td>
                </tr>`;

                if($('#reply_area').contents().size()==0){
                    commentArea.append(comment);
                } else {
                    $('#reply_area tr:last').after(comment);
                }

                //댓글 초기화
                $("#reply_writer").val("");
                $("#reply_password").val("");
                $("#reply_content").val("");
                $(`#reply_password_${comment_id}`).hide();
                $(`#delete_btn_${comment_id}`).hide();
                $(`#cancel_btn_${comment_id}`).hide();
                $(`#modify_btn_${comment_id}`).hide();
            }
        },
            error       :   function(request, status, error){
                console.log("AJAX_ERROR");
            }
        });
    }
    // 게시글 - 수정 메뉴 선택 시
    function correct_board_button_event() {
        $('#board-content').attr('readonly', false);
        $('#board-content').css('border', '1px solid #ccc'); // 테두리 추가
        $('#cancel_btn').show();
        $('#correct_btn').show();
        $('.input-group').show();
        $('#settings').hide();
    }

    // 게시글 수정 이벤트 -> 수정 버튼 클릭 이벤트.
    function correct_borad_event() {
         //값 셋팅
        let objParams = {
            boardNo        : window.location.href.split('/')[4],
            writerPw       : sha256($("#writer_pw").val().trim()),
            boardContent   : $('#board-content').val().trim()
        };
        if ($("#writer_pw").val().trim() == '') {
            jQuery.noConflict();
            $('#nullModal').modal('show');
        } else {
            console.log("backendURL ", backendURL)
            //ajax 호출 (여기에 댓글을 저장하는 로직을 개발)
            $.ajax({
                url         :   backendURL + "/board/correct",
                type        :   "PUT",
                data        :   objParams,
                success     :   function(result){
                if(result.success === true) {
                    console.log("result.success ", result)
                    jQuery.noConflict();
                    $('#confirmModal').modal('hide');
                    $('#correctModal').modal('show');
                    $('#board-content').attr('readonly', true);
                    $('#board-content').css('border', 'none');
                    $('#cancel_btn').hide();
                    $('#correct_btn').hide();
                    $('.input-group').hide();
                    $('#settings').show();
                    // $(`#comment_content_${commentId}`).css('border', 'none');
                } else {
                    jQuery.noConflict();
                    $('#confirmModal').modal('hide');
                    $('#FailModal').modal('show');
                }
            },
                error: function(request, status, error) {
                    if (request.status === 404) { // 서버가 404를 반환한 경우
                        const response = JSON.parse(request.responseText); // JSON 파싱
                        console.log("Error Message: ", response.message);
                        jQuery.noConflict();
                        $('#confirmModal').modal('hide');
                        $('#FailModal').modal('show');
                    } else {
                        console.log("Unexpected error: ", error);
                    }
                }
            });
        }
    }

    // 게시글 수정 취소 버튼 이벤트
    function correct_cancel_event() {
        $('#board-content').attr('readonly', true);
        $('#board-content').css('border', 'none');
        $('#correct_btn').hide();
        $('#cancel_btn').hide();
        $('.input-group').hide();
        $('#delete_btn').hide();
        $('#settings').show();
    }

    // 댓글 취소 버튼 이벤트
    function comment_cancel_event(commentId) {
        $(`#reply_password_${commentId}`).hide();
        $(`#delete_btn_${commentId}`).hide();
        $(`#cancel_btn_${commentId}`).hide();
        $(`#modify_btn_${commentId}`).hide();
        $(`#mod_${commentId}`).show();
        $(`#del_${commentId}`).show();
        $(`#comment_${commentId}`).show();
        $(`#comment_content_${commentId}`).css('border', 'none');
    }

    // 설정 - 삭제 메뉴 클릭 이벤트.
    function delete_board_button_event() {
        $('#delete_btn').show();
        $('#cancel_btn').show();
        $('.input-group').show();
    }

    // 댓글 - 삭제 버튼 클릭 시.
    function delete_comment_show_event(comment_id) {
        $(`#reply_password_${comment_id}`).show();
        $(`#delete_btn_${comment_id}`).show();
        $(`#cancel_btn_${comment_id}`).show();
        $(`#modify_btn_${comment_id}`).hide();
        $(`#mod_${comment_id}`).hide();
        $(`#del_${comment_id}`).hide();
        $(`#comment_${comment_id}`).hide();
    }

    // 댓글 - 수정 버튼 클릭 시.
    function modify_form_show(comment_id) {
        $(`#comment_content_${comment_id}`).attr('readonly', false);
        $(`#comment_content_${comment_id}`).css('border', '1px solid #ccc'); // 테두리 추가
        $(`#reply_password_${comment_id}`).show();
        $(`#modify_btn_${comment_id}`).show();
        $(`#cancel_btn_${comment_id}`).show();
        $(`#delete_btn_${comment_id}`).hide();
        $(`#mod_${comment_id}`).hide();
        $(`#del_${comment_id}`).hide();
        $(`#comment_${comment_id}`).hide();
    }

    // 대댓글 - 수정 버튼 클릭 시.
    function modify_sub_reply_form_show(comment_id) {
        $(`#reply_reply_content_${comment_id}`).attr('readonly', false);
        $(`#sub_reply_password_${comment_id}`).show();
        $(`#mod_sub_reply_${comment_id}`).show();
        $(`#cancel_sub_reply_${comment_id}`).show();
        $(`#del_sub_${comment_id}`).hide();
    }


    // 설정 - 삭제 시 확인 모달 창.
    function delete_confirm() {
        jQuery.noConflict();
        $('#delete_check_Modal').modal('show');
    }

    // 게시글 삭제 버튼 이벤트.
    function delete_board_event() {
            //값 셋팅
        var objParams = {
            boardNo        : window.location.href.split('/')[4],
            writerPw       : sha256($("#writer_pw").val().trim())
        };

        if($("#writer_pw").val().trim() == '') {
            jQuery.noConflict();
            $('#nullModal').modal('show');
        } else {
            //ajax 호출 (여기에 댓글을 저장하는 로직을 개발)
            $.ajax({
                url         :   backendURL + "/board/delete",
                type        :   "DELETE",
                data        :   objParams,
                success     :   function(result){
                    // console.log(result)
                    if (result.success === true ) {
                        jQuery.noConflict();
                        $('#delete_check_Modal').modal('hide');
                        $('#Delete_Modal').modal('show');
                    } else {
                        jQuery.noConflict();
                        $('#delete_check_Modal').modal('hide');
                        $('#FailModal').modal('show');
                    }
                },

                error: function(request, status, error) {
                    if (request.status === 404) { // 서버가 404를 반환한 경우
                        const response = JSON.parse(request.responseText); // JSON 파싱
                        console.log("Error Message: ", response.message);
                        jQuery.noConflict();
                        $('#delete_check_Modal').modal('hide');
                        $('#FailModal').modal('show');
                    } else {
                        console.log("Unexpected error: ", error);
                    }
                }
            });
        }
    }

    window.modify_form_show = modify_form_show;
    window.comment_cancel_event = comment_cancel_event;
    window.delete_comment_show_event = delete_comment_show_event;
    window.delete_confirm = delete_confirm;
    window.delete_board_event = delete_board_event;
    window.correct_cancel_event = correct_cancel_event;
    window.delete_board_button_event = delete_board_button_event;
    window.correct_borad_event = correct_borad_event;
    window.correct_board_button_event = correct_board_button_event;
    window.correct_comments = correct_comments;
    window.insert_comment = insert_comment;
    window.del_comment = del_comment;
    window.modify_sub_reply_form_show = modify_sub_reply_form_show;

})(window);