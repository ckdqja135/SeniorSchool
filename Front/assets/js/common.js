function move_link (url, data) {
    var mform = document.createElement('form');
    mform.style = "position: absolute; left: -1000px; top: -1000px";
    mform.action = url + data;
    mform.method = "POST";
    for (var i in data) {
        var tmp = document.createElement('input');
        tmp.name = i;
        tmp.value = data[i];
        mform.append(tmp);
    }
    document.body.append(mform);
    mform.submit();
}