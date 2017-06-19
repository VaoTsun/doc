var v = {
	wa: {"UtfFound":false}
	, gets: {}
};

function parseGet() {
        var vars= {};
        if(window.location.search.length!==0)
            window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value){
                key=decodeURIComponent(key);
                if(typeof vars[key]==="undefined") {vars[key]= decodeURIComponent(value);}
                else {vars[key]= [].concat(vars[key], decodeURIComponent(value));}
            });
        v.gets = vars;
        return vars;
};

parseGet();

function loadJSON(path, success, error, app) {
	var xhr = new XMLHttpRequest();
	if (path.substr(0,4) != 'http') {
		path = window.location.origin + path;
	}
	xhr.onreadystatechange = function() {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				if (success) {
					var json = IsJsonString(xhr.responseText);
					//console.log(d);
					var d = dataComplicated(json.obj);
						success(d,app);
				}
			} else {
				if (error)
					error(xhr);
			}
		}
	};
	xhr.open("GET", path, true);
	xhr.send();
}

function refrshTts() {
	document.getElementById("rf").style.display = 'none';
	loadJSON(
		"/db?q=gr"
		, function (e) {console.log(e);
				console.log(e);
				loadJSON(
					"/tts"
					, function (e) {
							document.getElementById("rf").style.display = '';
							console.log(e);
						}
					, null
					, null
				);
			}
		, null
		, null
	);
	

}

function importTags() {
	loadJSON(
		"/db?q=tags"
		, function (e) {
				var k = Object.keys(e.rows);
				var h = '<ul style="">';
				for (var i=0;i<e.rows.length;i++) {
					h += '<li title="' 
						+ e.rows[i].weight+'" >' 
						+ '<a href="?w='+ e.rows[i]["tag:utf"] +'" style="color:white;font-size:12px;">'
						+ e.rows[i]["tag:utf"] 
						+ '</a>'
					;
				}
				h += '</l>';
				document.getElementById("tags").innerHTML = h;
				console.log(e);
			}
		, null
		, null
	);

}

importTags();

function showLoved() {
	loadJSON(
		"/db?q=loverd&theKey=2"
		, function (e) {
				var k = Object.keys(e.rows);
				var h = '<ol>';
				for (var i=0;i<e.rows.length;i++) {
					h += '<li title="' + e.rows[i].added+'">' + e.rows[i]["ru:utf"];
				}
				h += '</ol>';
				document.getElementById("l").innerHTML = h;
				console.log(e);
			}
		, null
		, null
	);

}

function showRefreshed() {
	var url = "/db?q=words&w="+v.gets.w;
	console.log(url,v.gets.w);
	loadJSON(
		url
		, function (e) {
				var r = '<table style="width:100%;">';
				for (var i=0;i<e.rows.length;i++) {
							r += '<tr id="n'+i+'">'
								+ '<td>'
									+ '<u onclick="loadJSON(\'/db?q=love&theKey='+e.rows[i].ts+'\');this.parentNode.parentNode.style.display=\'none\';" style="color:green;">'+i+'</u>'
								+ '</td>'
								+ '<td title="'+ e.rows[i].ts +' - ' + e.rows[i]["ts:utf"] + '">'
									+ ' ' + e.rows[i]["utfs:utf"] 
								+ '</td>'
								+ '<td>'
									+ '<u onclick="loadJSON(\'/db?q=skip&theKey='+e.rows[i].ts+'\');this.parentNode.parentNode.style.display=\'none\';" style="color:red;font-size:22px;">&#x2620;</u>'
								+ '</td>'
								+ '<td>'
									+ '<u onclick="loadJSON(\'/db?q=skipTel&theKey='+e.rows[i].tel+'\');this.parentNode.parentNode.style.display=\'none\';">'+e.rows[i].tel+'</u>'
								+ '</td>'
								+ '</tr>'
							;
				}
				r += '</table>';
				document.getElementById("l").innerHTML = r;
				document.getElementById("cn").innerHTML = i;
			}
		, null
		, null
	);

}

function showtelAvoid() {
	loadJSON(
		"/db?q=avoid_tel&theKey=2"
		, function (e) {
				var k = Object.keys(e.rows);
				var h = '<ul>';
				for (var i=0;i<e.rows.length;i++) {
					h += '<li title="' + e.rows[i].ts+'">+' + e.rows[i].tel;
				}
				h += '</ul>';
				document.getElementById("l").innerHTML = h;
				console.log(e);
			}
		, null
		, null
	);

}

function showtelHash() {
	loadJSON(
		"/db?q=skipped"
		, function (e) {console.log(e);
				var h = '<ol>';
				for (var i=0;i<e.rows.length;i++) {
					h += '<li title="' + e.rows[i].ts+'">' + e.rows[i].ts+':: ' + e.rows[i]["ru:utf"];
				}
				h += '</ol>';
				document.getElementById("l").innerHTML = h;
				console.log(e);
			}
		, null
		, null
	);

}

showRefreshed();


function dataComplicated(data) {
	if (!data.rows) {
		//console.log('NO_DATA');
		return data;
	}
	if (typeof(data.rows) == 'number') {
		//console.log('not pg format - trying to guess...',data);
		data.rowCount=data.rows;
		data.rows = data.state;
	}
	
	var k = Object.keys(data.rows[0]);
	for (var i=0;i<k.length;i++) {
		if (k[i].slice(-4) == ':utf') {
			v.wa.UtfFound = true;
			console.log(':utf found => decoding hex');
		}
	
	}
	if (v.wa.UtfFound == true) {
		for (var i=0;i<data.rows.length;i++) {
			for (var e=0;e<k.length;e++) {
				if (k[e].slice(-4) == ':utf' && data.rows[i][k[e]] != null ) {
					data.rows[i][k[e]] = data.rows[i][k[e]].hexDecode();
				}
			}
		}
	}
	return data;
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

function IsJsonString(str) {
	var m = new Object({"exc" : "not json","string":str,"obj":{}});
    try {
        var r = JSON.parse(str);
    } catch (e) {
    	console.log(m);
        return m;
    }
    return new Object({"obj":r,"string":JSON.stringify(str,null,2)});
}

var menu = document.getElementById('p');
var menuPosition = menu.getBoundingClientRect().top;

window.onscroll = function() {
    if (window.pageYOffset >= menuPosition) {
        menu.style.position = 'fixed';
        menu.style.top = '0px';
    } else {
        menu.style.position = 'static';
        menu.style.top = '';
    }
};

