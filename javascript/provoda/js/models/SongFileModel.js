define(['provoda', 'app_serv'], function(provoda, app_serv){
"use strict";
var app_env = app_serv.app_env;

var FileInTorrent = function(sr_item){
	this.sr_item = sr_item;
	this.init();
};

provoda.Model.extendTo(FileInTorrent, {
	model_name: 'file-torrent',
	init: function() {
		this._super();
		this.updateManyStates({
			full_title: this.sr_item.title || app_serv.getHTMLText(this.sr_item.HTMLTitle),
			torrent_link: this.sr_item.torrent_link
		});
	},
	setPlayer: function() {
		return this;
	},
	activate: function() {
		return this;
	},
	deactivate: function() {
		return this;
	},
	download: function() {
		if (!window.btapp){
			app_env.openURL(this.sr_item.torrent_link);
		} else {
			btapp.add.torrent(this.sr_item.torrent_link);
		}
		this.updateState('download-pressed', true);
	}
});


	var counter = 0;
	var SongFileModel = function(){};
	provoda.Model.extendTo(SongFileModel, {
		model_name: 'file-http',
		init: function(opts) {
			this._super();
			if (opts.mo){
				this.mo = opts.mo;
			}
			if (opts.file){
				var file = opts.file;
				for (var a in file){
					if (typeof file[a] != 'function' && typeof file[a] != 'object'){
						this[a] = file[a];
					}
				}
				this.parent = file;
			}

			this.uid = 'song-file-' + counter++;
			this.createTextStates();
			return this;
		},
		createTextStates: function() {
			var states = {};
			states['title'] = this.getTitle();
			if (this.from){
				states['source_name'] = this.from;
			}
			if (this.description){
				states['description'] = this.description;
			}
			if (this.duration){
				states['duration'] = this.duration;
			}
			this.updateManyStates(states);
		},
		complex_states: {
			"visible_duration": {
				depends_on: ['duration', 'loaded_duration'],
				fn: function(duration, loaded_duration) {
					return duration || loaded_duration;
				}
			}
		},
		getTitle: function() {
			var title = [];

			if (this.artist){
				title.push(this.artist);
			}
			if (this.track){
				title.push(this.track);
			}
			return title.join(' - ');
		},
		events: {
			finish: function(){
				var mo = ((this == this.mo.mopla) && this.mo);
				if (mo){
					mo.updateState('play', false);
				}
				this.updateState('play', false);
			},
			play: function(){
				var mo = ((this == this.mo.mopla) && this.mo);
				if (mo){
					mo.updateState('play', 'play');
					if (!mo.start_time){
						//fixme
						mo.start_time = (Date.now()/1000).toFixed(0);
					}
				}
				this.updateState('play', 'play');
			},
			playing: function(opts){
				var dec = opts.position/opts.duration;
				this.updateState('playing_progress', dec);
				this.updateState('loaded_duration', opts.duration);
			},
			buffering: function(state) {
				this.updateState('buffering_progress', !!state);
			},
			loading: function(opts){
				var factor;
				if (opts.loaded && opts.total){
					factor = opts.loaded/opts.total;
				} else if (opts.duration && opts.fetched){
					factor = opts.fetched/opts.duration;
				}
				if (factor){
					this.updateState('loading_progress', factor);
				}
				

				
				var mo = ((this == this.mo.mopla) && this.mo);
				if (mo){
					mo.waitToLoadNext(factor > 0.8);
				}
			},
			pause: function(){
				var mo = ((this == this.mo.mopla) && this.mo);
				if (mo){
					mo.updateState('play', false);
				}
				this.updateState('play', false);
			},
			stop: function(){
				//throw "Do not rely on stop event"
				var mo = ((this == this.mo.mopla) && this.mo);
				if (mo){
					mo.updateState('play', false);
				}
				this.updateState('play', false);
			},
			error: function() {
				var d = new Date();
				this.updateState("error", d);
				if (this.parent){
					this.parent.error = d;
				}
				
				var _this = this;
				app_serv.getInternetConnectionStatus(function(has_connection) {
					if (has_connection) {
						var pp = _this.state("playing_progress");
						if (!pp){
							_this.failPlaying();
						} else {
							
							setTimeout(function() {
								if (_this.state("playing_progress") == pp){
									_this.failPlaying();
								}
							}, 3500);
						}
						
					}
				});
			}
		},
		failPlaying: function() {
			this.updateState("unavailable", true);
			if (this.parent){
				this.parent.unavailable = true;
			}
			this.trigger("unavailable");
		},
		setPlayer: function(player){
			if (player){
				this.player = player;
				player.attachSong(this);
			}
			return this;
		},
		_createSound: function(){
			if (!this.sound){
				this.sound = !!this.player.create(this);
			}
		},
		play: function(){
			if (this.player){
				this._createSound();
				if (this.sound){
					this.player.play(this);
					return true;
				}
				
			}
		},
		removeCache: function(){
			if (this.unloadOutBox){
				this.unloadOutBox();
			}
			this.player.remove(this);
			this.sound = null;
		},
		stop: function(){
			if (this.player){
				this.pause();
				this.setPosition(0, false, true);
				this.removeCache();

				var mo = ((this == this.mo.mopla) && this.mo);
				if (mo){
					mo.updateState('play', false);
				}

				this.updateState('play', false);
				this.updateState('loading_progress', 0);
				this.updateState('playing_progress', 0);
				
				this.sound = null;
			}
		},
		pause: function(){
			if (this.player){
				this.player.pause(this);
			}
		},
		setVolumeByFactor: function(fac){
			this.setVolumeByFactor(false, fac);
		},
		setVolume: function(vol, fac){
			if (this.player){
				this.player.setVolume(this, vol, fac);
			}
		},
		getDuration: function(){
			return this.duration || this.state('loaded_duration');
		},
		setPositionByFactor: function(fac){
			this.setPosition(false, fac);
		},
		setPosition: function(pos, fac, not_submit){
			if (this.player){
				this.player.setPosition(this, pos, fac);
				if (!not_submit){
					this.mo.posistionChangeInMopla(this);
				}
				
				
				
			}
		},
		load: function(){
			if (this.player){
				if (this.loadOutBox){
					this.loadOutBox();
				}
				this._createSound();
				if (this.sound){
					this.player.load(this);
				}
				
			}
		},
		activate: function() {
			this.updateState('selected', true);
		},
		deactivate: function() {
			this.updateState('selected', false);
		},
		markAsPlaying: function() {
			
		},
		unmarkAsPlaying: function() {
			
		}
	});

SongFileModel.FileInTorrent = FileInTorrent;
return SongFileModel;
});