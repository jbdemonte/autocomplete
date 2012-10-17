<?php
    $languages = explode(PHP_EOL, file_get_contents("languages.txt"));

    $test = strtolower($_POST["test"]);
    $length = strlen($test);
    foreach($languages as $language){
        if (strtolower(substr($language, 0, $length)) === $test){
            echo $language . PHP_EOL;
        }
    }
?>