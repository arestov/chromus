var require = {
	baseUrl: chrome.extension.getURL('javascript/provoda'),
	skipDataMain: true,
	paths: {
		provoda: 'js/libs/provoda',
		spv: 'js/libs/spv',
		su: 'js/seesu',
		jquery: 'js/common-libs/jquery-2.1.0.min',
		localizer: 'js/libs/localizer',
		cache_ajax: 'js/libs/cache_ajax',
		app_serv: "js/app_serv",
		hex_md5: 'js/common-libs/md5.min',
		angbo: 'js/libs/StatementsAngularParser.min'
	},
	shim: {
		hex_md5: {
			exports: 'hex_md5'
		}
	},

//	deps: ,
	callback: function() {
		require.load = function (context, moduleName, url) {
			var xhr = new XMLHttpRequest(),
				evalResponseText = function(xhr) {
					eval(xhr.responseText);
					context.completeLoad(moduleName);
				};

			xhr.open("GET", url, true);
			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && xhr.status === 200) {
					// we have to specifically pass the window context or underscore
					// will fail since it defines "root = this"
					evalResponseText.call(window, xhr);
				}
			};
			xhr.send(null);
		};
		require(['./pv-iframe/view_proxy'], function() {

		});
		//console.log(require);
	}
};
