define(['provoda', 'spv', 'app_serv'], function(provoda, spv, app_serv){
"use strict";
var localize = app_serv.localize;

var CommonMessagesStore = function(glob_store, store_name) {
	this.init();
	this.glob_store = glob_store;
	this.store_name = store_name;
};


provoda.Eventor.extendTo(CommonMessagesStore, {
	markAsReaded: function(message) {
		var changed = this.glob_store.set(this.store_name, message);
		if (changed){
			this.trigger('read', message);
		}
	},
	getReadedMessages: function() {
		return this.glob_store.get(this.store_name);
	}
});


var GMessagesStore = function(set, get) {
	this.sset = set;
	this.sget = get;
	this.store = this.sget() || {};
	this.cm_store = {};
};

spv.Class.extendTo(GMessagesStore, {
	set: function(space, message) {
		this.store[space] = this.store[space] || [];
		if ( this.store[space].indexOf(message) == -1 ){
			this.store[space].push(message);
			this.sset(this.store);
			return true;
		}
	},
	get: function(space) {
		return this.store[space] || [];
	},
	getStore: function(name) {
		return this.cm_store[name] || (this.cm_store[name] = new CommonMessagesStore(this, name));
	}
});

var BigContextNotify = function() {};
provoda.Model.extendTo(BigContextNotify, {
	init: function(opts, params) {
		this._super.apply(this, arguments);
		var _this = this;
		if (!this.cant_hide_notify){
			if (!params.notf){
				throw new Error('you must apply "notf"');
			}

			this.notf = params.notf;
			this.notf.on('read', function(value) {
				if (value == _this.notify_name){
					_this.updateState('notify_readed', true);
				}
				
			});

			if (params.notify_readed){
				_this.updateState('notify_readed', true);
			}
		}
		
	
	},
	cant_hide_notify: true,
	notify_name: 'vk_audio_auth'
});

var ImagesPack = function() {};
provoda.Model.extendTo(ImagesPack, {
	init: function() {
		this._super();
		this.images_by_source = {};
		this.all_images = [];
	},
	addImage: function(lfm_arr, source) {
		if (!this.images_by_source[source] && lfm_arr){
			this.images_by_source[source] = lfm_arr;
			this.all_images.push({
				data: lfm_arr,
				source: source
			});
			this.checkImages();
		}
	},
	checkImages: function() {
		var best_data = spv.filter(this.all_images, 'data.lfm_id', function(value) {
			return !!value;
		});
		if (!this.state('best_image')){
			if (best_data.length){
				this.updateState('best_image', best_data[0].data);
			}
			
		}
		if (!this.state('just_image')){
			if (best_data.not.length){
				this.updateState('just_image', best_data.not[0].data);
			}
			
		}
	}
});
var TrackImages  = function() {};
ImagesPack.extendTo(TrackImages, {
	init: function(artmd, info) {
		this._super();
	
		this.artmd = artmd;
		this.artist = info.artist;
		this.track = info.track;


		this.wch(artmd, 'image-to-use', 'artist_image');


	},
	complex_states: {
		'image-to-use': {
			depends_on: ['best_image', 'just_image', 'artist_image'],
			fn: function(bei, jui, arti){
				return bei || jui || arti;
			}
		}
	}
});

var ArtistImages = function() {};
ImagesPack.extendTo(ArtistImages, {
	init: function(artist_name) {
		this._super();

		this.artist_name = artist_name;
		
	},
	complex_states: {
		'image-to-use': {
			depends_on: ['best_image', 'just_image'],
			fn: function(bei, jui){
				return bei || jui;
			}
		}
	}
});

var LastFMArtistImagesSelector = function() {};
provoda.Eventor.extendTo(LastFMArtistImagesSelector, {
	init: function() {
		this._super();
		this.art_models = {};
		this.track_models = {};
		this.unknown_methods = {};
	},
	convertEventName: function(event_name) {
		return event_name.toLowerCase().replace(/^\s+|\s+$/, '');
	},
	getImageRewrap: function(obj) {
		if (!obj.array && !obj.item){
			return;
		}
		return this.getImageWrap(obj.array || obj.item);
	},
	getImageWrap: app_serv.getLFMImageWrap,
	setArtistImage: function(artist_name, lfm_arr, source) {
		this.getArtistImagesModel(artist_name).addImage(this.getImageWrap(lfm_arr), source);
	},
	setTrackImage: function(info, lfm_arr, source) {
		
		this.getTrackImagesModel(info).addImage(this.getImageWrap(lfm_arr), source);
	},
	setImage: function(info, source) {
		if (!info.artist){
			throw new Error('give me artist name');
		}
		if (!source){
			throw new Error('give me source');
		}
	},
	getTrackImagesModel: function(info) {
		if (!info.artist || !info.track){
			throw new Error ('give me full track info');
		}
		info = spv.cloneObj({}, info);
		
		info.artist = this.convertEventName(info.artist);
		info.track = this.convertEventName(info.track);

		var model_id = info.artist + ' - ' + info.track;
		if (!this.track_models[model_id]){

			var md = new TrackImages();
			md.init(this.getArtistImagesModel(info.artist), info);
			this.track_models[model_id] = md;
		}
		return this.track_models[model_id];
	},
	getArtistImagesModel: function(artist_name) {
		if (!artist_name){
			throw new Error('give me artist name');
		}
		artist_name = this.convertEventName(artist_name);
		
		if (!this.art_models[artist_name]){
			var md = new ArtistImages();
			md.init(artist_name);
			this.art_models[artist_name] = md;
		}
		return this.art_models[artist_name];
	},
	checkLfmData: function(method, r, parsed) {
		if (this.resp_handlers[method]){
			this.resp_handlers[method].call(this, r, method, parsed);
		} else {
			this.unknown_methods[method] = true;
		}
	},
	resp_handlers: {
		'artist.getInfo': function(r, method) {
			var artist_name = spv.getTargetField(r, 'artist.name');
			if (artist_name){
				var images = spv.getTargetField(r, 'artist.image');
				this.setArtistImage(artist_name, images, method);
			}
			var artists = spv.toRealArray(spv.getTargetField(r, 'artist.similar.artist'));
			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method + '.similar');
			}
			
			
		},
		'artist.getSimilar': function(r, method) {
			var artists = spv.toRealArray(spv.getTargetField(r, 'similarartists.artist'));
			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}
		},
		'geo.getMetroUniqueTrackChart': function(r, method) {
			var tracks = spv.toRealArray(spv.getTargetField(r, 'toptracks.track'));
			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist.name,
					track: cur.name
				}, cur.image, method);
				
			}
		},
		'album.getInfo': function(r, method) {
			var image = spv.getTargetField(r, 'album.image');
			var tracks = spv.toRealArray(spv.getTargetField(r, 'album.track'));
			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist.name,
					track: cur.name
				}, image, method);
				
			}
		},
		'playlist.fetch': function(r, method) {
			var tracks = spv.toRealArray(spv.getTargetField(r, 'playlist.trackList.track'));
			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.creator,
					track: cur.title
				}, cur.image, method);
			}

		},
		'user.getLovedTracks': function(r, method) {
			var tracks = spv.toRealArray(spv.getTargetField(r, 'lovedtracks.track'));

			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist.name,
					track: cur.name
				}, cur.image, method);
				
			}

		},
		'user.getRecommendedArtists': function(r, method) {
			var artists = spv.toRealArray(spv.getTargetField(r, 'recommendations.artist'));

			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}

		},
		'track.search': function(r, method) {
			var tracks = spv.toRealArray(spv.getTargetField(r, 'results.trackmatches.track'));

			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist,
					track: cur.name
				}, cur.image, method);
				
			}

		},
		'artist.search': function(r, method) {
			var artists = spv.toRealArray(spv.getTargetField(r, 'results.artistmatches.artist'));
			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}
		},
		'artist.getTopTracks': function(r, method, tracks) {
			tracks = tracks || spv.toRealArray(spv.getTargetField(r, 'toptracks.track'));
			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist.name,
					track: cur.name
				}, cur.image, method);
				
			}
		},
		'tag.getTopArtists': function(r, method, artists) {
			artists = artists || spv.toRealArray(spv.getTargetField(r, 'topartists.artist'));
			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}

		},
		'tag.getWeeklyArtistChart': function(r, method, artists) {
			artists = artists || spv.toRealArray(spv.getTargetField(r, 'weeklyartistchart.artist'));
			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}
		}
	}
});

var PartsSwitcher = function() {};

provoda.Model.extendTo(PartsSwitcher, {
	init: function() {
		this._super();
		this.context_parts = {};
		this.active_part = null;
	},
	hideAll: function() {
		if (this.active_part){
			this.updateState('active_part', false);
			this.active_part.deacivate();
			this.active_part = null;
		}
	},
	hide: function(name){
		if (this.context_parts[name] === this.active_part){
			this.hideAll();
		}
	},
	addPart: function(model) {
		if (!this.context_parts[model.model_name]){
			this.context_parts[model.model_name] = model;

			var array = this.getNesting('context_parts') || [];
			array.push(model);
			this.updateNesting('context_parts', array);

		}
	},
	getAllParts: function(){
		return this.context_parts;
	},
	switchPart: function(name) {
		if (this.context_parts[name] && this.context_parts[name] != this.active_part){
			if (this.active_part){
				this.active_part.deacivate();
			}
			this.active_part = this.context_parts[name];
			this.updateState('active_part', name);
			this.active_part.acivate();
			
	
		} else {
			this.hideAll();
		}
	}
});


var BaseCRow = function(){};
provoda.Model.extendTo(BaseCRow, {
	switchView: function(){
		this.actionsrow.switchPart(this.model_name);
	},
	hide: function(){
		this.actionsrow.hide(this.model_name);
	},
	deacivate: function(){
		this.updateState("active_view", false);
	},
	acivate: function(){
		this.updateState("active_view", true);
	}
});


var VkLoginB = function() {};
provoda.Model.extendTo(VkLoginB, {
	model_name: 'auth_block_vk',
	init: function(opts, params) {
		this._super();

		var _this = this;
		this.auth = opts.auth;
		this.pmd = opts.pmd;

		var settings_bits;

		if (params){
			if (params.open_opts){
				this.open_opts = params.open_opts;
				if (this.open_opts.settings_bits){
					settings_bits = this.open_opts.settings_bits;
				}
			}
			this.setRequestDesc(params.desc);

			if (params.notf){
				
				this.notf = params.notf;
				this.notf.on('read', function(value) {
					if (value == 'vk_audio_auth '){
						_this.updateState('notify_readed', true);
					}
					
				});

				if (params.notify_readed){
					_this.updateState('notify_readed', true);
				}
				this.updateState('has_notify_closer', true);
			}
		} else {
			this.setRequestDesc();
		}

		if (this.auth.deep_sanbdox){
			_this.updateState('deep-sandbox', true);
		}
		

		if (settings_bits){
			if (this.auth.checkSettings(settings_bits)){
				this.triggerSession();
			}
			this.auth.on('settings-change', function(sts) {
				if ((sts & settings_bits) * 1){
					_this.triggerSession();
				} else {
					_this.updateState('has_session', false);
				}
			});
			
		}

		if (this.auth.has_session){
			this.triggerSession();
		}
		this.auth.once('full-ready', function(){
			_this.triggerSession();
		});

		if (this.auth && this.auth.data_wait){
			this.waitData();
		} else {
			this.auth.on('data_wait', function(){
				_this.waitData();
			});
		}

	},
	removeNotifyMark: function() {
		this.notf.markAsReaded('vk_audio_auth ');
	},
	bindAuthReady: function(exlusive_space, callback) {
		this.auth.bindAuthReady(exlusive_space, callback, this.open_opts && this.open_opts.settings_bits);
	},
	triggerSession: function() {
		this.updateState('has_session', true);
	},
	waitData: function() {
		this.updateState('data_wait', true);
	},
	notWaitData: function() {
		this.updateState('data_wait', false);
	},
	setRequestDesc: function(text) {
		this.updateState('request_description', text ? text + " " + localize("vk-auth-invitation") : "");
	},
	useCode: function(auth_code){
		if (this.bindAuthCallback){
			this.bindAuthCallback();
		}
		this.auth.setToken(auth_code);

	},
	requestAuth: function(opts) {
		if (this.beforeRequest){
			this.beforeRequest();
		}
		this.auth.requestAuth(opts || this.open_opts);
	},
	switchView: function(){
		this.updateState('active', !this.state('active'));
	}
});



return {
	GMessagesStore:GMessagesStore,
	LastFMArtistImagesSelector:LastFMArtistImagesSelector,
	PartsSwitcher:PartsSwitcher,
	BaseCRow:BaseCRow,
	VkLoginB: VkLoginB
};
});

