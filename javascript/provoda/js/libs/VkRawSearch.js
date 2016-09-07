define(['spv', 'hex_md5', 'js/libs/Mp3Search', 'jquery', 'js/modules/wrapRequest'], function(spv, hex_md5, Mp3Search, $, wrapRequest){
"use strict";
var VkRawSearch = function(opts) {
	//this.api = opts.api;
	this.mp3_search = opts.mp3_search;
	this.queue = opts.queue;
	this.cache_ajax = opts.cache_ajax;

};

var standart_props = {
	from: 'vk',
	type: 'mp3',
	media_type: 'mp3'
};
VkRawSearch.prototype = {
	constructor: VkRawSearch,
	name: "vk",
	description: 'vk.com',
	slave: false,
	preferred: null,
	//q: p.queue,
	s: {
		name: 'vk',
		key: 'nice',
		type: 'mp3'
	},
	dmca_url: 'https://vk.com/dmca',
	makeSong: function(cursor, msq){

		cursor.models = {};
		cursor.getSongFileModel = Mp3Search.getSongFileModel;
		spv.cloneObj(cursor, standart_props);
		if (!cursor.artist){
			var guess_info = Mp3Search.guessArtist(cursor.track, msq && msq.artist);
			if (guess_info.artist){
				cursor.artist = guess_info.artist;
				cursor.track = guess_info.track;
			}
		}

		if (msq){
			this.mp3_search.setFileQMI(cursor, msq);
		}
		return cursor;
	},
	cache_namespace: 'vkraw',
	sendRequest: function(params, options) {
		options = options || {};
		options.cache_key = options.cache_key || hex_md5('audio' + spv.stringifyParams(params));

		var wrap_def = wrapRequest({
			url: 'https://vk.com/al_audio.php',
			type: "POST",
			dataType: 'text',
			// headers
			data: params,
			timeout: 20000,
			context: options.context
		}, {
			cache_ajax: this.cache_ajax,
			nocache: options.nocache,
			cache_key: options.cache_key,
			cache_timeout: options.cache_timeout,
			cache_namespace: this.cache_namespace,
			queue: this.queue
		});

		return wrap_def.complex;
	},
	findAudio: function(msq, opts) {
		var
			_this = this,
			query = msq.q ? msq.q: ((msq.artist || '') + (msq.track ?  (' - ' + msq.track) : ''));

		//query = query.replace(/\'/g, '').replace(/\//g, ' ');
		opts = opts || {};

		var limit_value =  msq.limit || 30;
		opts.cache_key = opts.cache_key || (query + '_' + limit_value);

		var async_ans = this.sendRequest({
			"al": 1,
			"act": "a_load_section",
			"type": "search",
			"offset": 0,
			"search_q": query,
			"search_performer": 0,
			"search_lyrics": 0,
			"search_sort": 0,
			"al_ad": null
		}, opts)
			.then(function (res) {
				if (res.indexOf( 'action="https://login.vk.com/"' ) != -1 ) {
					return null;
				}

				var list = parseVK(res)
					.map(function (item) {
						return _this.makeSong(item, msq);
					})
					.filter(function (item) {
						return _this.mp3_search.getFileQMI(item, msq) != -1;
					}) || [];

				_this.mp3_search.sortMusicFilesArray(list, msq);
				return list.slice(0, 6);
			})
			.then(function (list) {
				if (!list) {return null;}

				return _this.sendRequest({
					act: 'reload_audio',
					al: 1,
					ids: list.map(function(item) {return item._id;}).join(',')
				}).then(function (res) {
					var json = parse(res);

					var index = {};
					json.forEach(function (item) {
						index[getId(item)] = item[2];
					});

					list.forEach(function (item) {
						item.link = index[item._id];
					});

					return list.filter(function (item) {
						return item.link;
					});
				});
			});

		var olddone = async_ans.done,
			result;

		async_ans.done = function(cb) {
			olddone.call(this, function(r) {
				if (r === null) {
					return cb(null, 'mp3');
				}

				if (!result){
					result = r;
				}
				cb(result, 'mp3');

			});
			return this;
		};
		return async_ans;
	}
};


function parse(text) {
	var all = text.replace(/^<!--/, '').replace(/-<>-(!?)>/g, '--$1>').split('<!>');

	var parsed = all && all[5].replace(/^<\!json\>/, '');

	var json;
	try {
		json = JSON.parse(parsed);
	} catch (e) {}

	return json || null;
}

function getId(item) {
	return item[1] + '_' + item[0];
}

function parseVK(text) {
	var json = parse(text);

	// ["72272427", "11490336", "", "(You Gotta ) Fight for Your Right (to Party)",
	// "The Beastie Boys", 208, 0, 6228711, "(<a href="/id6228711" class="mem_link">А. Орехов</a>)", 0, 9, "", "[]", "3d41683aff7712ba98"]

	// id: 11490336_72272427

	return json.list.map(function (item) {
		return {
			_id: getId(item),
			artist: item[4],
			track: item[3],
			link: null,
			duration: parseFloat(item[5]) * 1000
		};
	});
}

return VkRawSearch;
});
