var sys    = require("util");
var url    = require("url");
var fs     = require('fs');
var html   = fs.readFileSync(__dirname+'/interface.html');
var server = require('http').createServer(function(req, res){
  res.end(html);
});
server.listen(8012, '127.0.0.1');
var nowjs    = require("now");
var everyone = nowjs.initialize(server);

var doUrl    = require("./urllib.js").processUrl;
var md5      = require("./tools.js").md5;
var starturl = "http://news.ycombinator.com/best";
var baseurl;
var maxdepth = 8;//only 8 best pages
var timeout  = 3000;//wait  between each page

var dbpath    = "./db.json";
var newdbpath = "./db.json.new";
var dbstoreint= 5000;

//todo: randomly change fetch-timeout :)

var doHNpage=function(url, depth){
//  sys.log("new hnpage: "+url);
    if(depth<0)
        return;
    
    sys.log("fetched hn-page "+((depth-maxdepth)*-1)+" url:"+url);
    doUrl(url, function($){
        $(".title").each(function(){
            var a=$("a",this);
            if(a.attr("rel")=="nofollow"){
                setTimeout(function(){
                    doHNpage(baseurl+a.attr("href"), depth-1);
                }, timeout);
                return;
            }
            doLink(a.attr("href"), a.text());
        });
    });
};

var urls={};
var doLink=function(link, text){
    if(!link||!text)
        return; 
    var hash=md5(link);
    //correct link after checksum to avoid "new" urls if check doesn't work
    if(urls[hash])
        return;
    //console.log("new link: "+link+"  "+text);
    link = makeUrlAbsolute(link);
    urls[hash] = {url:link, text:text, id:hash, read:false};
    newLink(link, text, hash);
};

var newLink=function(link, text, id){
    try{everyone.now.newLink(link, text,id);}catch(e){}
};


var readLink=function(id){
    urls[id].read=true;
    try{everyone.now.pushRead(id);}catch(e){}
};

var getUrls=function(){
  for(id in urls){
    var url=urls[id];
    if(url.read)
      continue;
    this.now.newLink(url.url, url.text, url.id);
  }
};

var writeDb=function(){
    fs.writeFile(newdbpath, JSON.stringify(urls), 'utf8', function(){
        fs.rename(newdbpath, dbpath, function(){
            setTimeout(function(){writeDb()},dbstoreint);
        });
    });
};

var readDb=function(){
    fs.readFile(dbpath, 'utf8', function(e, buffer){
        if(e)
            return loadFail("error reading file");//error message??
        try{
            urls=JSON.parse(buffer.toString());
            console.log("loaded url-db now bootstrapping and starting :)");
            bootstrap();
        }
        catch(e){return loadFail("json parsing failed")}
    });
    //check for db-file
    //try init
    //init urls, then bootstrap
};

var loadFail=function(msg){
    urls={};
    console.log("db load failed.: "+msg);
    bootstrap();
};

var bootstrap=function(){
    //init fetch and write to db
    setTimeout(function(){writeDb()},dbstoreint);
};

var makeUrlAbsolute=function(nurl){
    var turl = url.parse(nurl);
    if(turl.protocol)
        return nurl;
    var burl = url.parse(baseurl);
    return burl.protocol+"//"+burl.host+"/"+nurl;
};

var canfetch=true;
var fetchNew=function(){
    if(!canfetch){
        try{everyone.now.canFetch(false);}catch(e){}
        return;
    }
    setFetch(false);
    doHNpage(starturl, maxdepth);
    setTimeout(function(){setFetch(true);}, timeout*maxdepth);
    };
var setFetch=function(value){
    canfetch=value;
    try{everyone.now.canFetch(value);}catch(e){}
};

(function(){//setup-function
    var turl=url.parse(starturl);
    baseurl=turl.protocol+"//"+turl.host;
    everyone.now.readLink=readLink;
    everyone.now.getOldUrls=getUrls;
    everyone.now.fetchNew=fetchNew;

    //do this at the very end!!!
    readDb();
})();
