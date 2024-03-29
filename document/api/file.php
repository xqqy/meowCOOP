<?php
//文件分片上传核心
require("../../check.php");
checkc();//授权验证

/****
    waited
****/
//print_r($_FILES);exit;

$file = $_FILES['mof'];//文件段

$type = trim(strrchr($_POST['filename'], '.'),'.');

if($type=="htaccess" or $type=="exe" or $type=="php" or $type=="html"){
	die("危险文件，禁止上传");
}
$pkgnum=(int)$_POST['pkgnum'];


// print_r($_POST['test']);exit;

$con = new SQLite3("doc.db");
if (!$con){
    die('Could not connect: ');
}

$sql="SELECT `PKGNUM` FROM `UNDONE` WHERE `HASH`='".SQLite3::escapeString($_POST["hash"])."';";
$result= $con->query($sql);
if($row=$result->fetchArray(SQLITE3_ASSOC)){//断点续传重新握手
    if($pkgnum<$row['PKGNUM']){
        die("pkgnum!".$row['PKGNUM']);
    }
}else{
    $sql="INSERT INTO `UNDONE` (`FILENAME`,`HASH`,`PKGNUM`) VALUES ('".$_POST['filename']."', '".SQLite3::escapeString($_POST['hash'])."','".$pkgnum."')";
    $result=$con->query($sql);
}


if($file['error']==0){
    if(!file_exists('./upload/'.$_POST['filename'])){
        if(!move_uploaded_file($file['tmp_name'],'./upload/'.$_POST['filename'])){
            echo '移动文件失败';
        }else{
            $sql="UPDATE `UNDONE` SET `PKGNUM`='".$pkgnum."' WHERE `HASH`='".$_POST['hash']."'";
            $result=$con->query($sql);
            die("done");
        }
    }else{
        $content=file_get_contents($file['tmp_name']);
        if (!file_put_contents('./upload/'.$_POST['filename'], $content,FILE_APPEND)) {
            echo '合并文件失败';
        }else{
            $sql="UPDATE `UNDONE` SET `PKGNUM`='".$pkgnum."' WHERE `HASH`='".$_POST['hash']."'";
            $result=$con->query($sql);
            die("done");
        }
    }
}else{
    echo '文件上传失败';
}

?>
