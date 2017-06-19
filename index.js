var express = require('express')
	, fs = require('fs')
	, pg = require('pg')
	, q = require(__dirname+'/e/db.js')
;
var iconv = require('iconv');  
var querystring = require('querystring');
var crypto = require('crypto');


var app = express();
var types = require('pg').types
types.setTypeParser(20, function(val) {
  //remember: all values returned from the server are either NULL or a string
  return val === null ? null : parseInt(val)
})

if (process.argv[2]) {
	fs.readFile(process.argv[2],function (err, str){
		if (err) {
			console.log(err);
		}
		delete require.cache[require.resolve(process.argv[2])]
		var privateConf = require(process.argv[2]);
		q.central = privateConf.central;
	})
}


/*
var moment = require('moment')
var TIMESTAMPTZ_OID = 1114
var TIMESTAMP_OID = 1184
var parseFn = function(val) {
   return val === null ? null : moment(val)
}
types.setTypeParser(TIMESTAMPTZ_OID, parseFn)
types.setTypeParser(TIMESTAMP_OID, parseFn)
*/
//psql -c "select typname, oid, typarray from pg_type where typtype = 'b' order by oid"

/*
	when db result contains utf stringify or smth else cuts the length or data itself...
	so I just convirt it to hex as a bycicle
	http://stackoverflow.com/questions/21647928/javascript-unicode-string-to-hex
*/
String.prototype.hexEncode = function(){
    var hex, i;

    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }

    return result
}
String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
}

var go = {
	  "module" : ""
	, "extension" : ""
	, "cut" : {
		  "/" : "/h/index.html"
		, "/clicks" : "/h/table.html"
		, "/raindrops" : "/h/raindrops.html"
		, "/manitou" : "/h/manitou.test.html"
	}
	, "localHosts" : ['10.0.1.11','127.0.0.1','10.0.36.1','10.0.64.5','10.0.36.8']
};

function showHtml(_name,res) {
	fs.readFile(_name,function (err, html){
		returnHtml(html,res);
	})
}

function returnHtml (_html,res) {
	res.writeHead(200, {'Content-Type': 'text/html','Content-Length':_html.length});
	res.write(_html);
	res.end();
		//response.send(html);
	return null;
}

function shortLink (req,res) {
	//console.log(JSON.stringify(go));
	if ( go.module == '/proxy') {
		console.log(req.query.url,req.url);
		var request = require('request');
		request(decodeURIComponent(req.query.url), function (error, response, body) {
			  if (!error && response.statusCode == 200) {
				returnHtml (body,res);
				} else {
				returnHtml (JSON.stringify({"url":req.url,"err":error,"resp": response},null,2),res);
			  }
		});
		
		return true;
	} 
	if ( go.module == '/timestamp') {
		console.log(mq);
		var d = new Date;
		returnHtml (JSON.stringify({"ts":d.getTime(),"obj":d}),res);
		return true;
	} 
	if ( go.module == '/db') {
		fs.readFile(__dirname+'/q/'+req.query.q+'.sql',function (err, sql){
			
			var ks = Object.keys(req.query);
			for (var i=0;i<ks.length;i++) {
				if (ks[i] != 'q') {
					var re = new RegExp("__"+ks[i]+"__","g");
					sql = String(sql).replace(re, req.query[ks[i]]);
				}
			}
			if (err) {
				return console.log(err);
				//return returnHtml(String(err),res);
			}
			var dbe = require(__dirname+'/e/db.js');
			dbe.simpleQuery(String(sql),function() {
				//console.log(dbe.result);
				if (dbe.result.command != 'SELECT') {
					dbe.result.rows[0] = {"SQL_STMT":dbe.result.command};
				}
				if (dbe.result.rows.length < 1) {
					dbe.result.rows[0] = {};
					for (var fi = 0; fi<dbe.result.fields.length;fi++) {
						dbe.result.rows[0][dbe.result.fields[fi].name] = 'NO_DATA';
					}
					//dbe.result = {"rows":[{"EXCEPTION":"NO_DATA"}]};
				}
				var k = Object.keys(dbe.result.rows[0]);
				var hexNeeded = false;
				for (var e = 0; e<k.length; e++) {
					if (k[e].slice(-4) == ':utf') {
						hexNeeded = true;
						console.log('utf string alerted in "'+k[e]+'" => hexNeeded');
					}				
				}
				if (hexNeeded) {
					console.log('utf string alerted => preprocessing data internally');
					for (var i = 0; i<dbe.result.rows.length; i++) {
						for (var e = 0; e<k.length; e++) {
							if (k[e].slice(-4) == ':utf') {
								dbe.result.rows[i][k[e]] = dbe.result.rows[i][k[e]].hexEncode();
								//console.log(dbe.result.rows[i][k[e]].hexEncode());
							}				
						}
					}
					console.log(i + ' rows parsed');
				}
				
				returnHtml(JSON.stringify(dbe.result,null,2),res);
			});
		})
		return true;
	} 
	
	if ( go.module == '/c') {
		fs.readFile(__dirname+'/q/'+req.query.q+'.sql',function (err, sql){
			var ks = Object.keys(req.query);
			for (var i=0;i<ks.length;i++) {
				if (ks[i] != 'q') {
					var re = new RegExp("__"+ks[i]+"__","g");
					sql = String(sql).replace(re, req.query[ks[i]]);
				}
			}
			if (err) {
				return console.log(254,null,err);
			}
			var dbe = require(__dirname+'/e/db.js');
			dbe.privateSegmentQuery(String(sql),function() {
				console.log(dbe);
				if (dbe.result /*&& dbe.result.command=='SELECT'*/) {
					var k = Object.keys(dbe.result.rows[0]);
					var hexNeeded = false;
					for (var e = 0; e<k.length; e++) {
						if (k[e].slice(-4) == ':utf') {
							hexNeeded = true;
							console.log('utf string alerted in "'+k[e]+'" => preprocessing data internally');
						}				
					}
					if (hexNeeded) {
						console.log('utf string alerted => preprocessing data internally');console.log(99)
						for (var i = 0; i<dbe.result.rows.length; i++) {;
							for (var e = 0; e<k.length; e++) {
								if (k[e].slice(-4) == ':utf') {
									if (dbe.result.rows[i][k[e]] != null ) {
										dbe.result.rows[i][k[e]] = dbe.result.rows[i][k[e]].hexEncode();
										//console.log(dbe.result.rows[i][k[e]].hexEncode());
									}
								}				
							}
						}
						console.log(i + ' rows parsed');
					}
				
					} else {
					dbe.result = dbe.err;
				}
				returnHtml(JSON.stringify(dbe.result,null,2),res);
			});
		})
		return true;
	} 
	
	if ( typeof(go.cut[go.module]) != 'undefined' ) {
		return showHtml(__dirname+go.cut[go.module],res);
	} 
	returnHtml (req.url+'?.. Not sure what you want me to do... :/',res);
	return null;
}

app.set('port', (process.env.PORT || 3344));
app.use(express.static(__dirname + '/public'));

app.get('/*', function(req, res) {
	//console.log(req.connection.remoteAddress,req.headers);
	go.module = req.url.split('?')[0];

	if ( go.localHosts.indexOf(req.connection.remoteAddress) < 0 && req.url != '/timestamp') {//

		q.simpleQuery("insert into h_views (t,ip,headers,url) select clock_timestamp(),'"+req.connection.remoteAddress+"','"+JSON.stringify(req.headers, null,2)+"'::json ,'"+req.url+"'",function() {
			return null;
		});
	}
	
	if (go.module == '/ttsOld' ) {
		ttsOld(req,res);
		
		return null;
	}

	if (go.module == '/tts' ) {
		tts(req,res);
		
		return null;
	}
	
	if (String(req.url).indexOf('.') < 0 /* (|| String(req.url).split(".").length - 1) */ || String(req.url).indexOf('/proxy') > -1 || String(req.url).indexOf('/c?q=') > -1) {
		/*
		if ( req.url == '/db' ) {
			Q("select now(),* from h_views order by t desc limit 9",function() {
				//console.log(JSON.stringify(go.db.rslt, null,2));
				returnHtml (JSON.stringify(go.db.rslt, null,2),res)
			});
		}
		*/
		shortLink (req,res);
		return null;
		} else {
		go.extension = req.url.split('.')[req.url.split('.').length-1];
	
	
		var extension = req.url.split('.')[req.url.split('.').length-1];
		var permit = false;

		if (['gif','png','jpg','jpeg'].indexOf(extension) >-1 ) {
			var type = 'image/'+extension;
			var bin = 'binary';
			permit = true;
		}
		if (extension == 'html' ) {
			var type = 'text/'+extension;
			var bin = '';
			permit = true;
		}
		if ((extension == 'js' || extension == 'json') && ['/index.js','/gr.js','/config.js','/classifiers.json'].indexOf(req.url) < 0) {
			var type = 'application/javascript';
			var bin = '';
			permit = true;
		}
		if ( permit == true ) {
			fs.readFile(__dirname+'/'+req.url,function (err, data){
				console.log(err);
				if (data) {
					if (type == 'application/javascript') {
						data=String(data);
					}
					res.writeHead(200, {'Content-Type': type,'Content-Length':data.length});
					res.end(data, bin);
// 					/console.log(data);
					return true;
					} else {
					res.end('file' + req.url+' not found... And you what expected?..');
				}
			})
			return true;
			} else {
			returnHtml (req.url+'?.. What you want me to do?.. :/',res)
			return null;
		}
	}
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});



/*
this is for proxy
request('http://'+conf.app.host+':'+conf.app.port+'/'+conf.app.oauth2callback, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	conf.app.console('	::Initiated SSO');
	  }
});
*/

				//console.log(dbe.details);
				//returnHtml(JSON.stringify(dbe,null,2),res);
				//throw new Error('bah...');
				//return false;
				
				
function ttsOld(req,res) {
	if (!req.query.o) {
		req.query.o = 1;
	}


	var request = require('request');
	toOrg = "дача";
	toKey = new Buffer(toOrg, 'binary');
	toConv = new iconv.Iconv('utf8','windows-1251');
	toFin = toConv.convert(toKey).toString('utf8');
	console.log(toFin);

	var postData = querystring.stringify({
		  //search: toConv.convert(toKey).toString(),
		  //search: "butas",
		  search: toConv.convert(toKey),
		  
		  board: "find"
		});

	var options = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData)
		}
		, encoding: 'binary'
		, url: "http://board.tts.lt/index.php"
		, body: postData
	};

	request.post(options, function(error, response, html){
		console.log(error);
		//response.setEncoding('utf8');
		console.log(html.length);

		body = new Buffer(html, 'binary');
		conv = new iconv.Iconv('windows-1251', 'utf8');
		html = conv.convert(body).toString();

		var st = '<TD align="justify" valign="top" class=text>';
		var nd = '</TABLE>';

		var re = new RegExp(st+'(.*?)'+nd,"g");
		var f = html.match(re);
		var r = '<HTML><HEAD>'
			+ '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=utf8">'
			+ '<style>tr.nth-child(odd) {background-color:#efe;} tr:nth-child(even) {background-color: #eef;} tr:hover { color: brown;}</style>'
		;
	  
	  	if (f == null) {
	  		return returnHtml('no results for '+ postData,res);
	  	}
	  var Insert = '';
		f.forEach(function(e,i,a) {
			e = e.substring(st.length);
  		  	e = e.substring(0,e.length-nd.length);
		  	//r +=  '<li>' + e;
		  var look = [' дач',' дом',' земл','соток','сотк', 'хутор',' га ','авасарис','вишн','avasaris','Вишн'];
		  look.forEach(function(el,ix,ar) {
				if ( e.indexOf(el) > -1) {
					var md5 = crypto.createHash('md5').update(e.replace(/ /g, '')).digest("hex");
					Insert += "insert into tts.li (hs,ru) select '"+md5+"','"+e+"' where not exists (select 1 from tts.li where hs = '"+md5+"');";
					Insert += "insert into tts.keys (ts,hs,kw) select clock_timestamp(),'"+md5+"','"+el+"' where not exists (select 1 from tts.keys where hs = '"+md5+"' and kw='"+el+"');";
					var tel = prettyPhone(e);
					for (var y = 0; y < tel.length; y++) {
						Insert += "insert into tts.tel (ts,hs,tel) select clock_timestamp(),'"+md5+"','"+tel[y]+"' where not exists (select 1 from tts.tel where hs = '"+md5+"' and tel='"+tel[y]+"');";
						//console.log(ix,tel[y]);
					}
				}
		  });
 	  });	
			q.simpleQuery(Insert,function(a) {
				console.log(a,String(Insert).length);
				returnHtml ('{"refreshed":true}',res);
			});

	});

}

function tts(req,res) {
	console.log("tts called");
	if (!req.query.o) {
		req.query.o = 1;
	}

	var request = require('request');

	var postData = querystring.stringify({
	});

	var options = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData)
		}
		, encoding: 'binary'
		, url: "http://board.tts.lt/index.php"
		, body: postData
	};

	request.post(options, function(error, response, html){
		console.log(error);
		//response.setEncoding('utf8');
		console.log(html.length);

		body = new Buffer(html, 'binary');
		conv = new iconv.Iconv('windows-1251', 'utf8');
		html = conv.convert(body).toString();

		var st = '<TD align="justify" valign="top" class=text>';
		var nd = '</TABLE>';

		var re = new RegExp(st+'(.*?)'+nd,"g");
		var f = html.match(re);
		var r = '<HTML><HEAD>'
			+ '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=utf8">'
			+ '<style>tr.nth-child(odd) {background-color:#efe;} tr:nth-child(even) {background-color: #eef;} tr:hover { color: brown;}</style>'
		;
	  
	  	if (f == null) {
	  		return returnHtml('no results for '+ postData,res);
	  	}
	  var Insert = '';
		f.forEach(function(e,i,a) {
			e = e.substring(st.length);
  		e = e.substring(0,e.length-nd.length);
  		Insert += "\
  		begin;  		select * from adv.insert_text($wt$"+e+"$wt$,1); end;";
 	  });	
			q.simpleQuery(Insert,function(a) {
				console.log(a,String(Insert).length);
				returnHtml ('{"refreshed":true}',res);
			});

	});

}

function prettyPhone(a) {
	var rEx = /(\+370)(\s{0,1}\d{1}){8}/g;
	var m = a.match(rEx);
	var p = [];
	if (m) {
		for (var i = 0; i < m.length; i++) {
			var norm = m[i].split(' ').join('').split('-').join('').split('(').join('').split(')').join('');
			//console.log(norm);
			p[norm] = true;
		}
	}
	var rEx = /[8]{1}\d{8}/g;
	var m = a.match(rEx);
	if (m) {
		for (var i = 0; i < m.length; i++) {
			var norm = m[i].split(' ').join('').split('-').join('').split('(').join('').split(')').join('');
			console.log(norm);
				norm = '+370' + norm.substr(1);
			p[norm] = true;
		}
	}
	var rEx = /[8]{1}(\s{0,1}\d{1}){8}/g;
	var m = a.match(rEx);
	if (m) {
		for (var i = 0; i < m.length; i++) {
			var norm = m[i].split(' ').join('').split('-').join('').split('(').join('').split(')').join('');
				norm = '+370' + norm.substr(1);
			//console.log(norm);
			p[norm] = true;
		}
	}
	var rEx = /[6]{1}(\d{1}\s{0,1}){7}/g;
	var m = a.match(rEx);
	if (m) {
		for (var i = 0; i < m.length; i++) {
			var norm = m[i].split(' ').join('').split('-').join('').split('(').join('').split(')').join('');
				norm = '+370' + norm.substr(0);
			p[norm] = true;
		}
	}
	var phArr = Object.keys(p);
	//console.log(phArr);
	return phArr;
}