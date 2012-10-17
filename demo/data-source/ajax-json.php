<?php
    // here is a simple example of json exchange,
    // you can get your data from database or anywhere else

    $languages = explode(PHP_EOL, file_get_contents(dirname(__FILE__) . "/languages.txt"));

    $result = array();
    $test = strtolower($_POST["test"]);
    $length = strlen($test);
    foreach($languages as $language){
        if (strtolower(substr($language, 0, $length)) === $test){
            $result[] = $language;
        }
    }

    header("Content-Type: text/json; charset=UTF-8;");
    echo json_encode( $result );
    die;
?>