var jquery=require("jquery");
var jsdom =require("jsdom");

exports.processUrl=function (url, cb){
    jsdom.env({
      html: url,
      scripts: [],
      done: function(errors, window) {
        if(errors)
            throw errors;
        var $ = jquery.create(window);
        $._X_win=window;
        cb($);
      }
    });
};