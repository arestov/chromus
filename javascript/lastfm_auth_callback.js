var match = window.location.toString().match(/token=(.*)/);
if (match) {

	var port = chrome.extension.connect({name: "lfm_auth"});

	port.postMessage({method:'lfm_auth_token', token: match[1]});

	window.close();
}

