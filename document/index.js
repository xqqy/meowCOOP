//JavaScript上传核心
var dom = document.getElementsByTagName('form')[0];
var xhr = new XMLHttpRequest();
var fd; //文件分割片段
var file; //文件指针
const LENGTH = 1 * 1024 * 1024; //分片长度
var start; //分片起始位置
var end; //分片结束位置
var filename; //文件名
var hash; //文件哈希值
var pkgnum = 0; //当前文件分片位置

function upfile() { //上传文件准备
    /* document.getElementById("progress").style.display="block";
     document.getElementById("upimg").style.display="block";//显示提示框
     document.getElementById("load").style.display="block";*/
    $(function () {
        $("#upinfobu").popover('show');
    });
    start = 0; //开始节点
    end = LENGTH + start; //终止节点

    //file指针
    file = document.getElementById('filei').files[0];
    filename = file.name.replace(/\s/g, "_") //反空格技术
    if (!file) {
        alert('请选择文件');
        return;
    }
    document.getElementById("load").innerHTML = "计算哈希值……";
    document.getElementById("infos").innerHTML = "计算哈希值……";
    console.log("计算哈希值……");



    var reader = new FileReader();
    var blobSlice = File.prototype.slice;
    // 指定文件分块大小(2M)
    var chunkSize = 6 * 1024 * 1024;
    // 计算文件分块总数
    var chunks = Math.ceil(file.size / chunkSize);
    // 指定当前块指针
    var currentChunk = 0;
    var hasher = CryptoJS.algo.SHA256.create();
    // FileReader分片式读取文件
    // 计算开始读取的位置
    var start2 = currentChunk * chunkSize;
    // 计算结束读取的位置
    var end2 = start2 + chunkSize >= file.size ? file.size : start2 + chunkSize;
    reader.readAsArrayBuffer(blobSlice.call(file, start2, end2));
    reader.onload = function (evt) {
        var fileStr = evt.target.result;
        var tmpWordArray = CryptoJS.lib.WordArray.create(fileStr);
        hasher.update(tmpWordArray);
        currentChunk += 1;
        fileStr = null;
        tmpWordArray = null;
        // 判断文件是否都已经读取完
        if (currentChunk < chunks) {
            // 计算开始读取的位置
            var start2 = currentChunk * chunkSize;
            // 计算结束读取的位置
            var end2 = start2 + chunkSize >= file.size ? file.size : start2 + chunkSize;
            reader.readAsArrayBuffer(blobSlice.call(file, start2, end2));
        }
    }
    reader.onloadend = function () {
        // 判断文件是否都已经读取完
        if (currentChunk < chunks) {
            var hash = hasher.finalize(); //hash结果
            //开始上传信息
            document.getElementById("load").innerHTML = "";
            var xhrboth = new XMLHttpRequest(); //检查文件是否重复
            xhrboth.open("POST", "api/check.php", true);
            var dot = new FormData;
            dot.append("hash", hash);
            dot.append("filename", filename);
            xhrboth.send(dot);
            xhrboth.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200 && this.responseText == "notboth") { //无重复
                        up();
                        return;
                    } else if (this.status == 200 && this.responseText.split('!')[0] == "haveundone") { //发现应断点续传
                        pkgnum = this.responseText.split('!')[1]; //同步分片位置
                        pkgnum = parseInt(pkgnum);
                        pkgnum += 1;
                        start = LENGTH * pkgnum;
                        end = start + LENGTH;
                        up();
                    } else if (this.status == 401) {
                        $(function () {
                            $("#upinfobu").popover('hide');
                        });
                        alert("未登录")
                        auth();
                    } else {
                        erroring(xhrboth.responseText);
                        /*document.getElementById("progress").style.display="none";
                        document.getElementById("upimg").style.display="none";
                        document.getElementById("load").style.display="none";*/
                        $(function () {
                            $("#upinfobu").popover('hide');
                        });
                        return;
                    }
                }
            }
            //收集垃圾
            delete hasher;
            delete blobSlice;
            delete reader;
            delete hash;
        }
    }
}

function up() { //上传文件
    if (start < file.size) {
        xhr.open('POST', 'api/file.php', true); //传文件
        xhr.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status >= 200 && this.status < 300) {
                    if (this.responseText != "done") { //失败则报告并停止上传
                        alert(this.responseText);
                        document.getElementById('upimg').style.width = '0%';
                        /*document.getElementById("progress").style.display="none";
                        document.getElementById("upimg").style.display="none";
                        document.getElementById("load").style.display="none";*/
                        $(function () {
                            $("#upinfobu").popover('hide');
                        });
                    } else {
                        start = end;
                        end = start + LENGTH;
                        up(); //自调用来接着传
                    }

                } else if (this.status == 401) {
                    $(function () {
                        $("#upinfobu").popover('hide');
                    });
                    alert("未登录");
                    auth();
                } else {
                    alert("网络错误" + this.status)
                }
            }
        }
        xhr.upload.onprogress = function (ev) {
            if (ev.lengthComputable) {
                var pecent = 100 * (ev.loaded + start) / file.size;
                if (pecent > 100) {
                    pecent = 100;
                }
                //num.innerHTML=parseInt(pecent)+'%';
                document.getElementById('upimg').style.width = pecent + '%';
                document.getElementById('load').innerHTML = parseInt(pecent) + '%'
                document.getElementById('infos').innerHTML = "已上传：" + parseInt(pecent) + '%'
            }
        }

        //分割文件核心部分slice
        var blob = file.slice(start, end);
        fd = new FormData();
        fd.append('mof', blob); //文件
        fd.append('filename', filename); //文件名
        fd.append('pkgnum', pkgnum) //当前包数
        fd.append('hash', hash)
        //console.log(fd);
        console.log("正在上传包" + pkgnum)
        xhr.send(fd);
        pkgnum = parseInt(pkgnum) + 1;
    } else { //传完了提醒发下sql
        xhrend = new XMLHttpRequest();
        end = new FormData();
        xhrend.open("POST", "api/ok.php", true);
        end.append("size", file.size);
        end.append("filename", filename);
        end.append("hash", hash);
        xhrend.send(end);
        xhrend.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200 && this.responseText == "done") {
                    /*document.getElementById("progress").style.display="none";
                    document.getElementById("upimg").style.display="none";
                    document.getElementById("load").style.display="none";*/
                    $(function () {
                        $("#upinfobu").popover('hide');
                    });
                    document.location = 'index.php?success=上传成功'
                    return;
                } else if (this.status == 401) {
                    $(function () {
                        $("#upinfobu").popover('hide');
                    });
                    alert("未登录")
                    auth();
                } else {
                    alert(this.responseText);
                    /*document.getElementById("progress").style.display="none";
                    document.getElementById("upimg").style.display="none";
                    document.getElementById("load").style.display="none";*/
                    $(function () {
                        $("#upinfobu").popover('hide');
                    });
                    return;
                }
            }
        }
        return;
    }
}

function successing(what) {
    document.getElementById("warn").style.animation = "warn 4s forwards";
    document.getElementById("warn").innerHTML = '<div class="alert alert-success alert-dismissable fade in">' +
        '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">' +
        '&times;' +
        '</button>' +
        what +
        '</div>';
    setTimeout(function () {
        document.getElementById("warn").innerHTML = "";
        document.getElementById("warn").style.animation = "";

    }, 4001);
}

function erroring(what) {
    document.getElementById("warn").style.animation = "warn 4s forwards";
    document.getElementById("warn").innerHTML = '<div class="alert alert-danger alert-dismissable fade in">' +
        '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">' +
        '&times;' +
        '</button>' +
        what +
        '</div>';
    setTimeout(function () {
        document.getElementById("warn").style.animation = "";

        document.getElementById("warn").innerHTML = "";
    }, 4001);
}

function infoing(what) {
    document.getElementById("warn").style.animation = "warn 4s forwards";
    document.getElementById("warn").innerHTML = '<div class="alert alert-info alert-dismissable fade in">' +
        '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">' +
        '&times;' +
        '</button>' +
        what +
        '</div>';
    setTimeout(function () {
        document.getElementById("warn").style.animation = "";
        document.getElementById("warn").innerHTML = "";
    }, 4001);
}

function warning(what) {
    document.getElementById("warn").style.animation = "warn 4s forwards";
    document.getElementById("warn").innerHTML = '<div class="alert alert-warning alert-dismissable fade in">' +
        '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">' +
        '&times;' +
        '</button>' +
        what +
        '</div>';
    setTimeout(function () {
        document.getElementById("warn").style.animation = "";
        document.getElementById("warn").innerHTML = "";
    }, 4001);
}