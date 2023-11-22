(function (window) {
    function likeEvent() {
        let heartSpan = document.querySelectorAll('.icon');
        
        for(let i = 0; i< heartSpan.length; i++) {
            $(heartSpan[i]).on('click', function(e){
                if(heartSpan[i].classList.value == "icon like-default") {
                    heartSpan[i].classList.value = "icon like-fill";
                    heartSpan[i].firstChild.classList.value = "fa fa-heart";
                    e.stopPropagation();
                } else {
                    heartSpan[i].classList.value = "icon like-default";
                    heartSpan[i].firstChild.classList.value = "fa fa-heart-o";
                    e.stopPropagation();
                }
            });
        }
    }

    // 모달 입력 값 초기화
    function initButton() {
        $("#recipient-title").val("");
        $("#message-text").val("");
        $("#id").val("");
        $("#pw").val("");
        $('#replyId').val("");
        $('#replyPassword').val("");
    }

    // 게시판 조회하기.
    function inquiry_board(univData) {
        let univNo;
        if (univData == null) {
            univNo = window.univData.UnivNo;
        } else {
            univNo = univData.UnivNo;
        }

        let xhr = new XMLHttpRequest();
        let backendURL = 'http://localhost:3000';  // 백엔드의 주소
        xhr.open('GET', `${backendURL}/board/?UnivNo=${univNo}`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Cache-Control', 'no-cache'); // Cache-Control 헤더 추가

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                let result = JSON.parse(xhr.responseText);
                let univBoard = document.querySelector('.board');
                for (let i = 0; i < result.length; i++) {
                    let tr = document.createElement('tr');
                    tr.innerHTML = `<td id="title" style="cursor: pointer;">
                <a onclick="move_link('/board/', ${result[i].BoardNo})">
                    <h6>${result[i].BoardTitle}</h6>
                </a>
            </td>
            <td id="id"><h6>${result[i].BoardID}</h6></td>
            <td id="Regdate"><h6>${result[i].BoardRegDate}</h6></td>
            <td id="hits"><h6>${result[i].BoardHits}</h6></td>
            `;
                    univBoard.appendChild(tr);
                }

                // Clear the existing pagination elements
                $('.pagination').empty();

                // Call pagination function to create new pagination
                pagination();
            }
            // <td>
            //     <button className="likebtn" id="like${i}" onClick="likeEvent()">
            //                         <span id="heart${i}" className="icon like-default">
            //                             <i className="fa fa-heart-o" aria-hidden="true"></i> ${result[i].BoardLike}
            //                         </span>
            //     </button>
            // </td>
        };

        xhr.send();
    }


    // 날짜나 달에 1의 자리만 있을 경우 0을 붙여주는 함수.
    function day_month_format(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function create_board() {
        //  오늘 날짜 포맷 만들기.
        var date = new Date();
        var month = day_month_format(date.getMonth()+1); //months (0-11)
        var day = day_month_format(date.getDate()); //day (1-31)
        var year = date.getFullYear();
        var date_format =  year + "-" + month + "-" + day;

        var board_data = {
            church_no : window.univData.UnivNo,
            board_title : $('#recipient-title').val().trim(),
            board_content : $('#message-text').val(),
            board_reg : date_format,
            board_like : 0,
            board_hits : 0,
            board_id : $('#replyId').val().trim(),
            board_pw : sha256($('#replyPassword').val().trim()),
        };
        $.ajax({
            url : '/ajax/create_board',
            type : "POST",
            data : board_data,
            success : function(result) {
                console.log(result);
                $('#reviewModal').modal("hide");
                $(".modal-backdrop").remove();
                initButton();
                $(".board").empty();
                inquiry_board(null);
            },
            error : function(request,status,error) {
                console.log(request+"\n",status,"\n",error, "\n")
            }
        });
    }

    function shareTwitter(){
		// var sendText = window.location.href.split('/')[5];
		let sendText = "이 대학교 추천합니다.";
		//var sendUrl = "www.mysoftwiz.com/en/openVacanciesDetail/"+seq; // 전달할 URL
		window.open("https://twitter.com/intent/tweet?text=" + sendText + "&url=" + window.location.href);
		// window.open("https://twitter.com/intent/tweet?&url=" + makeUrl());
	}

    function shareFacebook() {
        let url = window.location.href; // 인코딩 없이 현재 URL 사용
        window.open("https://www.facebook.com/sharer/sharer.php?u=" + url);
    }

    function shareLink(){
		//var sendUrl = "www.mysoftwiz.com/en/openVacancies/"+seq;
		var textArea = document.createElement("textarea");
		document.body.appendChild(textArea);

		textArea.value = window.location.href;

		textArea.select();

		document.execCommand('copy');
		document.body.removeChild(textArea);

		alert("The link has been copied.");
	}

    // 페이징 함수
    function pagination() {
        // 시작 페이지
        let start_page = 1;
        // 페이지 별 보여줄 게시물 수.
        let req_num_row = 5;
        // 테이블의 각 행을 선택하여 변수 tr에 저장
        let tr = $('.board tr');
        // 총 행의 개수를 변수 total_num_row에 저장
        let total_num_row = tr.length;
        // 전체 페이지 수 계산
        let num_pages = Math.ceil(total_num_row / req_num_row);

         // 이전 버튼 추가
        if (num_pages > 0) {
            $('.pagination').append('<li class="page-item"><a class="page-link prev">Previous</a></li>');
        }

        // 페이지 버튼 추가 i는 페이지 버튼에 보여질 숫자기 떄문에 1부터 시작하는게 맞음.
        for (var i = 1; i <= num_pages; i++) {
            $('.pagination').append(`<li class="page-item"><a class="page-link ${i} pagination-link">${i}</a></li>`);
            $('.pagination li:nth-child(2)').addClass('active');
        }

        // 다음 버튼 추가
        if (num_pages > 1) {
            $('.pagination').append('<li class="page-item"><a class="page-link next">Next</a></li>');
        }

        // 시작 페이지일 경우 이전 버튼 비활성화
        if (start_page == 1) {
            $('.page-link.prev').parent().addClass('disabled');
        }

        // tr.each 함수를 통해 순회하면서 각 행에 대한 처리를 수행.
        tr.each(function (i) {
            // 모든 행을 숨김 처리하여 보이지 않도록 함
            $(this).hide();
            // 초기 페이지에 해당하는 게시물만 표시하기 위한 조건
            if (i < req_num_row) {
                // 초기 페이지에 해당하는 게시물 표시
                tr.eq(i).show();
            }
        });

        //  페이지 버튼 클릭 이벤트
        $('.pagination-link').click(function (e) {
            e.preventDefault();
            // 클릭된 페이지 버튼 저장.
            let clicked_page = $(this);
            // 클릭된 페이지 버튼과 그 부모인 .page-item 요소를 선택하여 변수에 저장
            let active = clicked_page.parent('.page-item');

            // 이미 활성화된 페이지를 클릭한 경우 아무 동작도 하지 않음
            if (active.hasClass('active')) {
                return;
            }
            // 모든 행을 숨김 처리하여 보이지 않도록 함
            tr.hide();
            // 클릭한 페이지로 현재 페이지 갱신
            start_page = parseInt(clicked_page.text());
            // 시작 인덱스 계산
            let start = (start_page - 1) * req_num_row;
            // 종료 인덱스 계산
            let end = start + req_num_row;

            // 해당 페이지에 해당하는 게시물 표시
            tr.slice(start, end).show();

            $('.pagination li').removeClass('active');
            active.addClass('active');

            $('.page-link.prev').parent().removeClass('disabled');
            $('.page-link.next').parent().removeClass('disabled');

            // 시작 페이지일 경우 이전 버튼 비활성화
            if (start_page === 1) {
                $('.page-link.prev').parent().addClass('disabled');
            }

            // 마지막 페이지일 경우 다음 버튼 비활성화
            if (start_page === num_pages) {
                $('.page-link.next').parent().addClass('disabled');
            }
        });

        // 이전 페이지 이동 이벤트.
        $('.prev').click(function (e) {
            e.preventDefault();
            // 현재 활성화된 페이지 버튼 가져오기
            let active = $('.pagination .page-item.active');
            // 이전 페이지 버튼 찾기
            let prev_button = active.prevAll('.page-item:not(.disabled):not(.prev)').first();

            if (prev_button.length) {
                // 이전 페이지가 현재 활성화된 페이지가 아닐 때만 이전 버튼 클릭 이벤트 실행
                if (!prev_button.hasClass('active')) {
                    prev_button.find('.page-link').trigger('click');
                }
            }
        });

        // 다음 페이지 이동 이벤트.
        $('.next').click(function (e) {
            e.preventDefault();
            // 현재 활성화된 페이지 버튼 가져오기
            let active = $('.pagination li.active');
            // 다음 페이지 버튼 찾기
            let next_button = active.next('.page-item:not(.disabled)');

            if (next_button.length) {
                // 다음 페이지의 숫자 가져오기
                let next_page_number = parseInt(next_button.children('.page-link').text());
                // 해당 숫자의 페이지 버튼 클릭 이벤트 실행
                $('.pagination-link').eq(next_page_number-1).trigger('click');
            }
        });
    }


    window.pagination = pagination;
    window.shareTwitter = shareTwitter;
    window.shareFacebook = shareFacebook;
    window.shareLink = shareLink;
    window.likeEvent = likeEvent;
    // window.likeevent2 = likeevent2;
    window.initButton = initButton;
    window.inquiry_board = inquiry_board;
    window.create_board = create_board;
})(window);