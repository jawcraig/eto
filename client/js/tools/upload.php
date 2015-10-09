$xmlcontent = $GLOBALS["HTTP_RAW_POST_DATA"];
$handle = fopen($_SERVER["DOCUMENT_ROOT"].'panorama.xml', 'wb');
fwrite($handle,$xmlcontent);
fclose($handle);
