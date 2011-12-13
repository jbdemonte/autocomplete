/*
 *  Autocomplete Plugin for JQuery 
 *  Version   :
 *  Date      : 
 *  Licence   : GPL v3 : http://www.gnu.org/licenses/gpl.html  
 *  Author    : DEMONTE Jean-Baptiste
 *  Contact   : jbdemonte@gmail.com
 *  Web site  :       
 */
 
(function ($) {
  
  //*************************************************
  // global variables
  //*************************************************
  var publics = ['enable', 'disable', 'flushCache', 'trigger', 'display', 'close'],
      global = this,
      namespace = 'autocomplete'; // used to store the autocomplete object in $.data() and to create class name

  
  //*************************************************
  // default options
  //*************************************************
  var defOptions = {
    ajax:{ // options for $.ajax
      url: document.URL,
      type: "POST",
      dataType: "json",
      data:{}
    },
    cb:{              // callback
      populate:null,  // popupate data to send in $.ajax, if not define, data name is input name or id 
      cast:null,      // cast an item<mixed> to string in order to display it to the completion
      process:null,   // after getting the result, it allows to manipulate data before displaying the completion
      preselect:null, // on highlight item
      select: null,   // on select item
      unselect: null  // on validate a non item value
    },
    width:'auto',     // auto : min-width = width of the input, false : width of the input, "other" : "other"
    delay: 250,       // delay in ms after key pressed and before post
    name: null,       // post key : name, else input[name], else input[id]
    minLength: 1,     // min lenght to complete : 0 / false : not used, > 0 : min length
    cache: true,      // ajax : cache result to save exchange
    once: false,      // ajax : false : idle, true : only require ajax exchange once => data source don't change : set filter to true if not defined in init
    filter: true,     // run match filter
    source:null,      // null => ajax, [], string or callback function
    prefix:true,      // match by prefix of source data 
    splitChr:null,    // used character to split data (default is \n)
    autohide: false,  // autohide if not hover : 0 / false : not used, > 0 : delay in ms
    loop: true,       // up / down loop 
    className : namespace
  };  
  
  //*************************************************
  // Mixed functions
  //*************************************************
  function clone(mixed){
    var result;
    if ($.isArray(mixed)){
      result = [];
      $.each(mixed, function(i, value){
        result.push(value);
      });
    } else if (typeof(mixed) === 'object'){
      result = $.extend(true, {}, mixed);
    } else {
      result = mixed;
    }
    return result;
  }
  
  //*************************************************
  // class Autocomplete
  //*************************************************
  function Autocomplete($this){
    var options = {},           // options of the autocomplete =  user define + default
        toComplete, toAutoHide, // timeout 
        $list,                  // jQuery dropbox
        iHover = -1,            // index of highlighted element 
        dataCount = 0,          // item count in dropbox
        gData,                  // store current data to return real object instead of "toString" values
        cache = {},             // ajax cache => [ input value ] = ajax result  
        binded = false,         // events on <input> are binded or not => enable / disable autocomplete  
        scrolling = false,      // true before starting to scroll by using up / down key and false after onScroll event => needed to disable mouse over item event which highlight overed item  
        that = this,
        handlers = {            // functions to bind
          key: function(e){
            that.key.apply(that, [e]);
          },
          focusout: function(e){
            if (!$(this).data(namespace + '-focus')){
              that.hide(true);
            }
          },
          dblclick: function(){
            if (!$list){
              that.updateTOComplete();
            }
          }
        };
    
    // initialize the completion
    this.init = function(opts){
      
      // extends defaults options
      options = $.extend(true, {}, defOptions, opts);
      
      // initialise source data
      if (typeof(options.source) === 'string'){
        options.source = this.splitData(options.source);
      }
      
      // some browsers use key "down" to make their own autocompletion (Opera)
      $this.attr('autocomplete', 'off');
      
      // bind events
      this.bind();
    }
    
    // split data using splitChar or default
    this.splitData = function(data){
      if (options.splitChr){
        return data.split(options.splitChr);
      } else {
        return data.split(/\r\n|\r|\n/);
      }
    }
    
    // run callback or return source 
    this.getSource = function(source){
      if (typeof(source) === 'function'){
        return this.getSource.apply(this, [source.apply($this, [$this.val()])]); // result of the callback is re-processed (in case of result string ...)
      } else if (typeof(source) === 'string'){
        return this.splitData(source)
      }
      return source;
    }
    
    // flush cache
    this.flush = function(){
      cache = {};
    }
    
    // bind events
    this.bind = function(){
      if (!binded){
        $this[$.browser.opera ? 'keypress' : 'keydown'](handlers.key);
        $this.focusout(handlers.focusout);
        $this.dblclick(handlers.dblclick);
        binded = true;
      }
    }
    
    // unbind events
    this.unbind = function(){
      if (binded){
        $this.unbind($.browser.opera ? 'keypress' : 'keydown', handlers.key);
        $this.unbind('focusout', handlers.focusout);
        $this.unbind('dblclick', handlers.dblclick);
        binded = false;
      }
    }
    
    // restart the timeout to run autohide
    this.updateToAutoHide = function(){
      if (!options.autohide){
        return;
      }
      this.stopToAutoHide();
      toAutoHide = setTimeout(function(){that.hide(that, [true]);}, options.autohide);
    }
    
    // stop the autohide
    this.stopToAutoHide = function(){
      if (toAutoHide){
        clearTimeout(toAutoHide);
        toAutoHide = null;
      }
    }
    
    // restart the timeout to run the autocompletion
    this.updateTOComplete = function(noWait){
      var that = this;
      clearTimeout(toComplete);
      toComplete = setTimeout(function(){that.complete.apply(that, []);}, noWait ? 0 : options.delay);
    }
    
    // highlight on/off an item by its index (0..n-1) 
    this.hover = function(i, show){
      var $li = $list ? $('li', $list).eq(i) : null;
      if ($li){
        $li[(show ? 'add' : 'remove')+'Class']('hover');
        if (show){
          this.scroll($li);
        }
      }
    }
    
    // scroll to make visible if needed the selected item
    this.scroll = function($element){
      var top = $list.scrollTop(),
          height = $list.innerHeight(),
          eTop = $element.position().top,
          eHeight = $element.outerHeight();
      if (eTop < 0){
        scrolling = true;
        $list.scrollTop(top + eTop);
      } else if (eTop + eHeight > height){
        scrolling = true;
        $list.scrollTop(top + eTop - height + eHeight);
      }
    }
    
    // locate next index to highlight
    this.getPageUpDownItem = function(up){ 
      if (!$list){
        return false;
      }
      var height = $list.innerHeight(),

          pageCount = 0, next = iHover;
      // count visible element to process pageUp/Down
      $('li', $list).each(function(i, element){
        var $element = $(element);
        pageCount += ($element.position().top >= 0) && ($element.position().top + $element.outerHeight() <= height) ? 1 : 0;
      });
      if (iHover < 0){ // not highlighted
        return (up ? dataCount : pageCount) - 1; // up : last item, down : last of first pageCount
      }
      next += up ? -pageCount : pageCount;
      next = Math.max(0, next);
      next = Math.min(next, dataCount-1);
      if (options.loop && (next == iHover)){ // borders
        next = next === 0 ? dataCount-1 : 0;
      }
      return next;
    }
    
    // manage key pressed
    this.key = function(e){
      var c = e.keyCode, next;
      if (c === 9) { // tab
        // do nothing
      } else if (!$list && (c !== 27) && (c !== 13)){ // completion empty and not [esc] or [enter]
        this.updateTOComplete();
      } else if ( (c === 38) || (c === 40) ){ // up / down
        next = iHover + (c === 38 ? -1 : 1);
        if (options.loop){
          if (next < 0){
            next = dataCount - 1;
          } else if (next > dataCount - 1){
            next = 0;
          }
        }
        next = Math.max(0, next);
        next = Math.min(next, dataCount-1);
        this.preselect(next);
        e.preventDefault();
      } else if ( (c === 33) || (c === 34) ){ // page up / down
        next = this.getPageUpDownItem(c === 33);
        if (next !== false){
          this.preselect(next);
        }
        e.preventDefault();
      } else if (c === 13){ // enter
        if (iHover !== -1){
          this.select(iHover, $('li', $list).eq(iHover).text());
          e.preventDefault();
          e.stopImmediatePropagation();
        } else {
          this.hide(true);
        }
      } else if (c === 27){ // esc
        this.preselect(-1);
        this.hide(true);
      } else {
        this.updateTOComplete();
      }
    }
    
    // create the data object to send in $.ajax
    this.data = function(){
      var data, name = 'value';
      if (typeof(options.cb.populate) === 'function'){
        data = $.extend(true, {}, options.ajax.data, options.cb.populate.apply($this, []));
      } else {
        data = $.extend(true, {}, options.ajax.data);
        if (options.name && options.name.length){
          name = options.name ;
        } else if ($this.attr('name') && $this.attr('name').length) {
          name = $this.attr('name');
        } else if ($this.attr('id') && $this.attr('id').length) {
          name = $this.attr('id');
        }
        data[ name ] = $this.val();
      }
      return data;
    }
    
    // branch complete : ajax or use local source
    this.complete = function (){
      var value = $this.val();
      // check min length required to run completion
      if (options.minLength && (options.minLength > value.length)){
        if (this.hide(true)){
          this.preselect(-1);
        }
        return;
      }
      
      if (options.source){
        this.completeSource();
      } else {
        this.completeAjax();
      }
    }
    
    // filter data to match with user input
    this.filterData = function(/*array*/data, /*function*/cast){
      var re = new RegExp((options.prefix ? '^' : '') + $this.val().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i"), //escape regular expression
          result = [],
          i;
      for(i=0; i<data.length; i++){
        if (re.test(cast(data[i]))){
          result.push(data[i]);
        }
      }
      return result;
    }
    
    // run the completion : use local source
    this.completeSource = function(){
      this.show(this.getSource(options.source), true);
    }
    
    // run the completion : use cache or call $.ajax
    this.completeAjax = function(){
      var that = this, 
          value = $this.val(),
          settings;
      
      // use cache if available
      if (cache && ((options.once && !$.isEmptyObject(cache)) || (options.cache && (typeof(cache[value]) !== 'undefined')))){
        var data = options.once ? clone(cache) : clone(cache[value]);
        // user process
        if (typeof(options.cb.process) === 'function'){
          data = options.cb.process.apply($this, [data, options.once ? 'once' : 'cache']);
        }
        if (typeof(data) === 'string'){
          data = that.splitData(data);
        }
        this.show(data, options.filter);
        return;
      }
      
      settings = $.extend(true, {}, options.ajax);
      settings.success = function(data, textStatus, jqXHR){
        // store result if it will be re-used
        if (options.once){
          cache = clone(data);
        } else if (options.cache){
          cache[value] = clone(data);
        }
        // user process
        if (typeof(options.cb.process) === 'function'){
          data = options.cb.process.apply($this, [data, textStatus, jqXHR]);
        }
        if (typeof(data) === 'string'){
          data = that.splitData(data);
        }
        that.show.apply(that, [data, options.filter]);
      }
      
      settings.data = this.data();
  		$.ajax(settings);
    }
    
    // preselect an item (highlight : off the previous, on the new + run callback)
    this.preselect = function(next){
      this.updateToAutoHide();
      if (iHover === next){
        return;
      }
      this.hover(iHover, false);
      iHover = next;
      this.hover(iHover, true);
      if (typeof(options.cb.preselect) === 'function'){
        options.cb.preselect.apply($this, [iHover===-1?null:gData[iHover], iHover]);
      }
    }
    
    // select an item : select data in textbox, run the callback
    this.select = function(i, value){
      this.stopToAutoHide();
      if (value === null){
        value = $this.val();
      } else {
        $this.val(value);
      }
      this.hide();
      if (typeof(options.cb.select) === 'function'){
        options.cb.select.apply($this,[gData[i], i]);
      }
    }
    
    // use data receive from post or cache to display the selectbox
    this.show = function(data, filter){
      var that = this,
          position = $this.position(),
          width = $.browser.msie ? $this.outerWidth() : $this.width(),
          cast = options.cb.cast || function(s){return s};
      
      this.hide();
      
      if (!data || (typeof(data) !== 'object') || !data.length){
        return;
      }
      
      if ( (typeof(filter) === 'undefined' && options.filter) || filter){
        data = this.filterData(data, cast);
      } 
      
      gData = data;
      
      $list = $('<ul class="'+options.className+'"></ul>')
        .css('position', 'absolute')
        .css('left', position.left + 'px')
        .css('top', (position.top + $this.outerHeight()) + 'px')
        .scroll(function(){
          scrolling = false;
        });
      
      // adjust width
      if (options.width === 'auto'){
        $list.css($.browser.msie ? 'width' : 'minWidth', width + 'px');
      } else if (options.width === false){
        $list
          .css('width', width + 'px')
          .css('overflow', 'hidden');
      } else {
        $list
          .css('width', options.width)
          .css('overflow', 'hidden');
      }
      
      // add items
      iHover = -1;
      dataCount = data.length;
      $.each(data, function(i, value){
        var $li = $('<li></li>'), $a = $('<a></a>');
        $a.click(function(){
          that.select.apply(that, [i, cast(value)]);
        });
        $li.hover(
          function(){
            if (!scrolling){ // on manual scrolling (up / down key), if mouse is over item, this event must be disable
              that.preselect(i);
            }
          }
        );
        $list.append($li.append($a.append(cast(value))));
      });
      
      // while clicking on an item, $this trigger the focusout, so the item click is lost
      $list.hover(
        function(){
          $this.data(namespace + '-focus', true);
          that.stopToAutoHide();
        },
        function(){
          $this.data(namespace + '-focus', false);
          that.updateToAutoHide();
          if (!$this.is(':focus')){
            $this.trigger('focusout');
          } 
        }
      );
      
      $this.after($list);
      
      // manage min-width, min-height, max-width, max-height for IE
      if ($.browser.msie){
        $.each("min max".split(" "), function(isMax, type) {
          $.each("Width Height".split(" "), function(i, property) {
            var v = parseInt($list.css(type + property));
            if (!isNaN(v) && ( ($list[property.toLowerCase()]() < v) ^ isMax) ){
              $list.css(property.toLowerCase(), v + 'px');
            }
          });
        });
      }
      
      this.updateToAutoHide();
    }
    
    // look for value in $list
    this.reverse = function(value){
      var result = null ;
      $('li', $list).each(function(i, element){
        if ( (result === null) && ($(element).text() === value)){
          result = i;
        }
      });
      return result;
    }
    
    // hide the selectbox
    this.hide = function(reverse){
      if ($list) {
        if (reverse){ // user escape or not select any item, but value is in the list, so run callback
          var value = $this.val(),
              index = !value.length || (options.minLength && (options.minLength > value.length)) ? null : this.reverse(value);
          if (index !== null){
            this.select(index);
            return ;
          } else if (typeof(options.cb.unselect) === 'function'){
            options.cb.unselect.apply($this, []);
          }
        }
        this.stopToAutoHide();
        $list.remove();
        $list = null;
        iHover = -1;
        return true;
      }
      return false;
    }
    
    // check if user can call an internal function
    this.isPublic = function(name){
      for(var i = 0; i < publics.length; i++){
        if (publics[i] === name) {
          return true;
        }
      }
      return false;
    }
    
    // process jQuery call
    this.process = function(){
      var p = [];
      for(var i=0; i<arguments.length; i++){
        p.push(arguments[i]);
      }
      
      if (p.length && typeof(p[0]) === 'string'){
        var fn = p.shift();
        if ( this.isPublic(fn) ){
          this[fn].apply(this, p)
        }
      } else {
        this.init.apply(this, p);
      }
    }
  }
  
  //*************************************************
  // class Autocomplete : Public functions
  //*************************************************
  Autocomplete.prototype.flushCache = function(){
    this.flush();
  }
  
  Autocomplete.prototype.enable = function(){
    this.bind();
  }
  
  Autocomplete.prototype.disable = function(){
    this.unbind();
    this.preselect(-1);
    this.hide();
  }
  
  Autocomplete.prototype.trigger = function(){
    this.updateTOComplete(true);
  }
  
  Autocomplete.prototype.display = function(source, filter){
    this.show(this.getSource(source), filter);
  }
  
  Autocomplete.prototype.close = function(){
    this.hide();
  }
  
  
  //*************************************************
  // Plugin jQuery
  //*************************************************
  $.fn.autocomplete = function(){
    var args = arguments;
  
    $.each(this, function() { // loop on each jQuery objects
      var $this = $(this),
          current = $this.data(namespace);
          
      if (!current){
        current = new Autocomplete($this);
        $this.data(namespace, current);
      }
      current.process.apply(current, args);
      
    });
    
    return this;
  }

}(jQuery));