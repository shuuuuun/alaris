import $ from 'jquery-deferred';

// prefix: 
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || function(callback){ var id = window.setTimeout(callback,1000/60); return id; };
window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame || window.oCancelAnimationFrame || function(id){ window.clearTimeout(id); };

const Util = {
  TRANSITIONEND: "transitionend webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd",
  ANIMATIONEND: "animationend webkitAnimationEnd mozAnimationEnd msAnimationEnd oAnimationEnd",
  getRandomInt: function(min, max){
    return Math.floor( Math.random() * (max - min + 1) ) + min;
  },
  throttle: function(fn, interval){
    var isWaiting = false;
    var exec = function(event) {
      if (isWaiting) return;
      isWaiting = true;
      setTimeout(function() {
        isWaiting = false;
        fn(event);
      }, interval);
    };
    return exec;
  },
  debounce: function(fn, interval){
    var timer;
    var exec = function(event) {
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn(event);
      }, interval);
    };
    return exec;
  },
  async: function(fnList){
    // fnList ... 第一引数にcallbackを取る関数の配列
    (function exec(index){
      if (!fnList[index]) return;
      fnList[index](function(){
        exec(index + 1);
      });
    })(0);
  },
  delay: function(time){ // asyncで使う用
    return function(callback){
      setTimeout(callback, time);
    };
  },
  sleep: function(time){ // Deferred
    return function(){
      var dfd = $.Deferred();
      setTimeout(function(){
        dfd.resolve();
      }, time);
      return dfd.promise(); 
    };
  },
  zeroPadding: function(num, len){
    return (new Array(len).join("0") + num).slice(-len);
  },
  getQueryString: function(){
    var result = {};
    var search = window.location.search;
    if (search.length > 1) {
      var query = search.substring(1);
      var parameters = query.split("&");
      for(var i = 0; i < parameters.length; i++){
        var element = parameters[i].split("=");
        var paramName = decodeURIComponent(element[0]);
        var paramValue = decodeURIComponent(element[1]);
        result[paramName] = paramValue;
      }
    }
    return result;
  },
  getUserAgent: function(){
    Util.ua = {};
    Util.ua.name = window.navigator.userAgent.toLowerCase();
    Util.ua.isSP = /ipod|iphone|ipad|android/i.test(Util.ua.name);
    Util.ua.isPC = !Util.ua.isSP;
    Util.ua.isIOS = /ipod|iphone|ipad/i.test(Util.ua.name);
    Util.ua.isAndroid = /android/.test(Util.ua.name);
    Util.ua.isIE = /msie|trident/i.test(Util.ua.name);
    Util.ua.isIE8 = /msie 8/.test(Util.ua.name);
    Util.ua.isIE9 = /msie 9/.test(Util.ua.name);
    Util.ua.isIE10 = /msie 10/.test(Util.ua.name);
    Util.ua.isMac = /macintosh/.test(Util.ua.name);
    Util.ua.isChrome = /chrome/.test(Util.ua.name);
    Util.ua.isFirefox = /firefox/.test(Util.ua.name);
    Util.ua.isSafari = /safari/.test(Util.ua.name);
    Util.ua.isMacSafari = Util.ua.isSafari && Util.ua.isMac && !Util.ua.isChrome; // chromeのuaにもsafariの文字列がある
    if (Util.ua.isSP) document.body.className += " isSP";
    if (Util.ua.isPC) document.body.className += " isPC";
    return Util.ua;
  },
};

module.exports = Util;
