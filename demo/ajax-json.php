<?php
  if (isset($_POST['test'])){
    require('data-source/ajax-json.php');
  }
?>
<html>    
  <head> 
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <script type="text/javascript" src="../jquery/jquery-1.7.js"></script>
    <script type="text/javascript" src="../jquery-autocomplete.js"></script>
    <link rel="stylesheet" type="text/css" href="../jquery-autocomplete.css" />
    
    <script type="text/javascript">
    
      $(function(){
        // this example use the default values : post to this script, use "test" as variable name
        $('#entry').autocomplete().focus();
      });
      
    </script>  
  </head>
    
  <body>
    <span>Programming language</span> : <input id="entry" type="text" name="test">
  </body>
</html>