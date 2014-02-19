define(['provoda', 'spv', 'jquery', 'app_serv'], function(provoda, spv, $, app_serv) {
"use strict";
var counter = 0;

provoda.addPrototype("SongBase",{
	model_name: "song",
	init: function(opts, params){

		this._super(opts);

		this.neighbour_for = null;
		this.marked_prev_song = null;
		this.marked_next_song = null;
		this.ready_to_preload = null;
		this.waiting_to_load_next = null;
		this.track = null;
		this.rtn_request = null;
		this.playable_info = null;
		
		this.plst_titl = opts.plst_titl;
		this.mp3_search = opts.mp3_search;
		this.player = opts.player;
		
		this.uid = ++counter;
		if (opts.omo.track){
			opts.omo.track = opts.omo.track.trim();
		}
		
		spv.cloneObj(this, opts.omo, false, ['artist', 'track']);
		this.omo = opts.omo;

		this.init_states['no_track_title'] = false;
		if (opts.omo.artist){
			this.init_states['artist'] = opts.omo.artist && opts.omo.artist.trim();
		}
		if (opts.omo.track){
			this.init_states['track'] = opts.omo.track;
		}
		this.init_states['playlist_type'] = this.plst_titl.playlist_type;
		this.init_states['url_part'] = this.getURL();
		//this.updateManyStates(states);

		this.on('requests', this.hndRequestsPrio, this.getContextOptsI());
	},
	hndRequestsPrio: function() {
		this.plst_titl.checkRequestsPriority();
		
	},
	complex_states: {
		'one_artist_playlist': {
			depends_on: ['playlist_type'],
			fn: function(playlist_type) {
				return playlist_type == 'artist';
			}
		},
		'selected_image': {
			depends_on: ['lfm_image', 'ext_lfm_image', 'image_url', 'album_image'],
			fn: function(lfm_i, ext_lfm, just_url, album_image) {
				return album_image || lfm_i || just_url || ext_lfm;
			}
		},
		'song_title': {
			depends_on: ['artist', 'track'],
			fn: function(artist, track){
				return this.getFullName(artist, track);
			}
		},
		'nav_short_title': {
			depends_on: ['artist', 'track'],
			fn: function(artist, track) {
				return this.getFullName(artist, track, true);
			}
		},
		'nav_title': {
			depends_on: ['artist', 'track'],
			fn: function(artist, track){
				return this.getFullName(artist, track);
			}
		},
		is_important: {
			depends_on: ['mp_show', 'player_song', 'want_to_play'],
			fn: function(mp_show, player_song, wapl){
				if (mp_show){
					return 'mp_show';
				}
				if (player_song){
					return 'player_song';
				}
				if (wapl){
					return 'want_to_play';
				}
			}
		},
		'can-use-as-neighbour':{
			depends_on: ['has_none_files_to_play'],
			fn: function(h_nftp) {
				if (h_nftp){
					return false;
				} else {
					return true;
				}

			}
		},
		'has_none_files_to_play': {
			depends_on: ['search_complete', 'no_track_title', 'mf_cor_has_available_tracks'],
			fn: function(scomt, ntt, mf_cor_tracks) {
				if (this.getMFCore() && !mf_cor_tracks){
					if (this.getMFCore().isSearchAllowed()){
						if (scomt){
							return true;
						}
					} else {
						return true;
					}
				}
				
				if (ntt){
					return true;
				}
				return false;
			}
		}
	},
	canUseAsNeighbour: function(){
		return this.state('can-use-as-neighbour');
	},
	state_change: {
		"mp_show": function(state) {
			if (state){
				this.prepareForPlaying();
				this.requestState('album_name');
				
			} else {
				this.removeMarksFromNeighbours();
			}
		},
		"player_song": function(state){

			if (state){
				this.mp3_search.on("new-search.player_song", this.findFiles, {exlusive: true, context: this});
			}
		},
		"is_important": function(state){
			if (!state){
				this.unloadFor(this.uid);

				spv.cloneObj(this, {
					next_song: false,
					prev_song: false,
					next_preload_song: false
				});
			}
		}
	},
	wantSong: function() {
		if (this.player){
			this.player.wantSong(this);
		}
		this.makeSongPlayalbe(true);
	},
	prepareForPlaying: function() {

		this.makeSongPlayalbe(true);

		this.mp3_search.on("new-search.viewing-song", this.findFiles, {exlusive: true, context: this});
	},
	simplify: function() {
		return spv.cloneObj({}, this, false, ['track', 'artist']);
	},
	
	mlmDie: function() {
		
	},
	getFullName: function(artist, track, allow_short){
		var n = '';
		if (this.artist){
			if (this.track){
				if (allow_short && this.plst_titl && (this.plst_titl.info && this.plst_titl.info.artist == this.artist)){
					n = this.track;
				} else {
					n = this.artist + " - " + this.track;
				}
			} else {
				n = this.artist;
			}
		} else if (this.track){
			n = this.track;
		}
		return n || 'no title';
	},
	playNext: function(auto) {
		if (this.state('rept-song')){
			this.play();
		} else {
			this.plst_titl.switchTo(this, true, auto);
		}
		
	},
	playPrev: function() {
		this.plst_titl.switchTo(this);
	},
	findNeighbours: function(){
		this.plst_titl.findNeighbours(this);
	},
	/*
	downloadLazy: spv.debounce(function(){
		var song = spv.getTargetField(this.mf_cor.songs(), "0.t.0");
		if (song){
			downloadFile(song.link);
		}
	}, 200),*/
	canPlay: function() {
		return this.getMFCore().canPlay();
	},
	preloadFor: function(id){
		this.getMFCore().preloadFor(id);
	},
	unloadFor: function(id){
		this.getMFCore().unloadFor(id);
	},
	setVolume: function(vol, fac){
		this.getMFCore().setVolume(vol, fac);
	},
	stop: function(){
		this.getMFCore().stop();
	},
	switchPlay: function(){
		this.getMFCore().switchPlay();
	},
	pause: function(){
		this.getMFCore().pause();
	},
	play: function(mopla){
		this.getMFCore().play(mopla);

	},
	markAs: function(neighbour, mo){
		if (!this.neighbour_for){
			this.neighbour_for = mo;
			this.updateState('marked_as', neighbour);
		}
	},
	unmark: function(mo){
		if (this.neighbour_for == mo){
			this.neighbour_for = null;
			this.updateState('marked_as', false);

		}
	},
	wasMarkedAsPrev: function() {
		return this.state('marked_as') && this.state('marked_as') == 'prev';
	},
	wasMarkedAsNext: function() {
		return this.state('marked_as') && this.state('marked_as') == 'next';
	},
	addMarksToNeighbours: function(){
		
		if (!this.marked_prev_song || this.marked_prev_song != this.prev_song){
			if (this.marked_prev_song){
			//	this.marked_prev_song.unmark(this);
			}
			if (this.prev_song){
				(this.marked_prev_song = this.prev_song);//.markAs('prev', this);
			}
		}
		if (!this.marked_next_song || this.marked_next_song != this.next_song){
			if (this.marked_next_song){
				//this.marked_next_song.unmark(this);
			}
			if (this.next_song){
				(this.marked_next_song = this.next_song);//.markAs('next', this);
			}
		}
		this.plst_titl.checkShowedNeighboursMarks();
		
	},
	removeMarksFromNeighbours: function(){
		if (this.marked_prev_song){
			//this.marked_prev_song.unmark(this);
			this.marked_prev_song = null;
		}
		if (this.marked_next_song){
			//this.marked_next_song.unmark(this);
			this.marked_next_song = null;
		}
		this.plst_titl.checkShowedNeighboursMarks();
	},
	waitToLoadNext: function(ready){
		this.ready_to_preload = ready;
		if (ready){
			if (!this.waiting_to_load_next && this.player.c_song == this && this.next_preload_song){
				var nsong = this.next_preload_song;
				var uid = this.uid;
				this.waiting_to_load_next = setTimeout(function(){
					nsong.preloadFor(uid);
				}, 4000);
			}
		} else if (this.waiting_to_load_next){
			clearTimeout(this.waiting_to_load_next);
			delete this.waiting_to_load_next;
		}
	},
	isImportant: function() {
		return this.state('is_important');
	},
	
	checkNeighboursChanges: function(changed_neighbour, viewing, log) {
		this.plst_titl.checkNeighboursChanges(this, changed_neighbour, viewing, log);
	},
	hasNextSong: function(){
		return !!this.next_song;
	},
	setSongName: function(song_name, full_allowing, from_collection, last_in_collection) {
		song_name = song_name && song_name.trim();
		this.track = song_name;
		this.updateManyStates({
			'track': song_name,
			'url_part': this.getURL()
		});

		this.findFiles({
			only_cache: !full_allowing,
			collect_for: from_collection,
			last_in_collection: last_in_collection
		});
	},
	req_map: [
		[
			['album_name', 'album_image', 'listeners', 'playcount', 'duration', 'top_tags'],
			new spv.MorphMap({
				source: 'track',
				not_array: true,
				props_map: {
					album_name: 'album.title',
					album_image: ['lfm_image', 'album.image'],
					listeners: ['num', 'listeners'],
					playcount: ['num', 'playcount'],
					duration: ['num', 'duration'],
				},
				parts_map: {
					top_tags: {
						source: 'toptags.tag',
						props_map: 'name'
					}
				}
			}, {
				num: function(value) {
					return parseFloat(value);
				},
				lfm_image: function(value) {
					return app_serv.getLFMImageWrap(value);
				}
			}),
			function(opts) {
				return this.app.lfm.get('track.getInfo', {
					artist: this.state('artist'),
					track: this.state('track')
				}, {nocache: opts.has_error});
			},
			['error']
		]
	],
	getRandomTrackName: function(full_allowing, from_collection, last_in_collection){
		this.updateState('track_name_loading', true);
		var _this = this;

		/*
		инфа из лфм +


		треки ex.fm  +
		треки в sc +
		треки lfm +


		есть ли профиль в sc
		*/
		


		if (!this.track && !this.rtn_request){
			var all_requests = [];
			var can_search_wide = !!this.mp3_search.getSearchByName('vk');


			var def_top_tracks = $.Deferred();
			




			var
				def_podcast,
				def_soundcloud,
				def_exfm;

			


			
			all_requests.push(def_top_tracks);
			this.addRequest(this.app.lfm.get('artist.getTopTracks',{'artist': this.artist, limit: 30, page: 1 })
				.done(function(r){
					var tracks_list = spv.toRealArray(spv.getTargetField(r, 'toptracks.track'));
					var tracks_list_clean = [];
					for (var i = 0; i < tracks_list.length; i++) {
						var cur = tracks_list[i];
						tracks_list_clean.push({
							artist: cur.artist.name,
							track: cur.name
						});
					}

					def_top_tracks.resolve(tracks_list_clean);
					
				})
				.fail(function() {
					def_top_tracks.resolve();
				}), {space: 'acting'});



			if (!can_search_wide){
				def_podcast = $.Deferred();
				def_soundcloud = $.Deferred();
				def_exfm = $.Deferred();


				all_requests.push(def_podcast);
				this.addRequest(this.app.lfm.get('artist.getPodcast', {artist: this.artist})
					.done(function(r) {
						var tracks_list = spv.toRealArray(spv.getTargetField(r, 'rss.channel.item'));
						var tracks_list_clean = [];
						var files_list = [];
						
						for (var i = 0; i < tracks_list.length; i++) {
							var cur = tracks_list[i];
							var link = decodeURI(cur.link);
							var parts = link.split('/');
							var track_name = parts[parts.length-1];
							tracks_list_clean.push({
								artist: _this.artist,
								track: track_name
							});
							files_list.push(_this.app.createLFMFile(_this.artist, track_name, link));

						}
						_this.mp3_search.pushSomeResults(files_list);
						def_podcast.resolve(tracks_list_clean);
					})
					.fail(function() {
						def_podcast.resolve();
					}), {space: 'acting'});



				var pushMusicList = function(music_list, deferred_obj) {
					var filtered = [];

					for (var i = 0; i < music_list.length; i++) {
						var cur = music_list[i];
						var qmi = _this.mp3_search.getFileQMI(cur, {artist: _this.artist});
						if (qmi != -1){
							if (cur.artist && cur.artist.toLowerCase() == _this.artist.toLowerCase()){
								if (qmi < 20){
									filtered.push(cur);
								}
							}
						}
					}
					_this.mp3_search.pushSomeResults(music_list);

					deferred_obj.resolve(filtered);
				};

				all_requests.push(def_soundcloud);
				var sc_search = this.mp3_search.getSearchByName('soundcloud');
				if (!sc_search){
					def_soundcloud.resolve();
				} else {
					this.addRequest( sc_search.findAudio({artist: this.artist})
						.done(function(music_list) {
							pushMusicList(music_list, def_soundcloud);
							//var music_list_filtered =
						})
						.fail(function() {
							def_soundcloud.resolve();
						}),
					{space: 'acting'}
					);
				}


				all_requests.push(def_exfm);
				var exfm_search = this.mp3_search.getSearchByName('exfm');
				if (!exfm_search){
					def_exfm.resolve();
				} else {
					this.addRequest(   exfm_search.findAudio({artist: this.artist})
						.done(function(music_list) {
							pushMusicList(music_list, def_exfm);
						})
						.fail(function() {
							def_exfm.resolve();
						}),
					{space: 'acting'}
					);
				}
			}


			var any_track_with_file = Math.round(Math.random());


			var big_request = this.rtn_request = $.when.apply($.when, all_requests)
				.done(function(top_tracks, podcast, sc_list, exfm_list) {
					if (_this.track){
						return;
					}
					top_tracks = top_tracks && top_tracks.length && top_tracks;

					var selectRandomTrack = function(tracks_list) {
						if (tracks_list && tracks_list.length){
							var some_track = tracks_list[Math.floor(Math.random()*tracks_list.length)];
							_this.setSongName(some_track.track, full_allowing, from_collection, last_in_collection);
						} else {
							_this.updateState("no_track_title", true);
							
						}

						
					};

					if (!can_search_wide){
						var all_with_files = [];
						
						if (podcast && podcast.length){
							all_with_files = all_with_files.concat(podcast);
						}
						if (sc_list && sc_list.length){
							all_with_files = all_with_files.concat(sc_list);
						}
						if (exfm_list && exfm_list.length){
							all_with_files = all_with_files.concat(exfm_list);
						}

						var single_files_store = spv.makeIndexByField(all_with_files, 'track');
						var single_tracks_list = [];
						var track_name;
						for (track_name in single_files_store){
							single_tracks_list.push({
								artist: _this.artist,
								track: track_name
							});
						}

						if (any_track_with_file){
							if (single_tracks_list.length){
								selectRandomTrack(single_tracks_list);
							} else {
								selectRandomTrack(top_tracks);
							}
							
						} else {
							
							var top_index = spv.makeIndexByField(top_tracks, 'track');
							var both_match_tracks_list = [];
							for (track_name in top_index){
								if (single_files_store[track_name]){
									both_match_tracks_list.push({
										artist: _this.artist,
										track: track_name
									});
								}
							}
							if (both_match_tracks_list.length){
								selectRandomTrack(both_match_tracks_list);
							} else if (single_tracks_list.length) {
								selectRandomTrack(single_tracks_list);
							} else {
								selectRandomTrack(top_tracks);
							}
						}
					} else {
						selectRandomTrack(top_tracks);
					}
					



					
				})
				.always(function() {
					_this.updateState('track_name_loading', false);
					if (_this.rtn_request == big_request){
						delete _this.rtn_request;
					}
					_this.checkChangesSinceFS();
				});
		}

		
	},
	prefindFiles: function(){
		this.findFiles({
			get_next: true
		});
	},
	updateFilesSearchState: function(opts){

		//var _this = this;
		/*
		var opts = {
			complete:,
			have_tracks: mp3,
			have_best_tracks: ''
		};
		*/

		//this.trigger('files_search', opts);
		this.updateState('files_search', opts);
		this.checkChangesSinceFS(opts);
	},
	investg_rq_opts: {
		depend: true,
		space: 'acting'
	},
	hndInvestgReqs: function(array) {
		this.addRequests(array, this.investg_rq_opts);
	},
	hndLegacyFSearch: function(e) {
		this.updateFilesSearchState(e.value);
	},
	hndHasMp3Files: function(e) {
		this.updateState('playable', e.value);
		if (e.value){
			this.plst_titl.markAsPlayable();
		}
	},
	bindFilesSearchChanges: function() {
		var investg = this.getMFCore().files_investg;
		investg
			.on('requests', this.hndInvestgReqs, this.getContextOptsI());

		this
			.wch(investg, 'search_complete')
			.wch(investg, 'has_request', 'searching_files')
			.wch(investg, 'legacy-files-search', this.hndLegacyFSearch)
			.wch(investg, 'has_mp3_files', this.hndHasMp3Files);

	},
	isSearchAllowed: function() {
		return this.getMFCore() && this.getMFCore().isSearchAllowed();
	},
	findFiles: function(opts){
		if (!this.artist || !this.track || !this.isSearchAllowed()){
			return false;
		}
		if (this.mp3_search){
			opts = opts || {};
			opts.only_cache = opts.only_cache && !this.state('want_to_play') && (!this.player.c_song || this.player.c_song.next_preload_song != this);
		
			this.getMFCore().startSearch(opts);
		}
	},
	makeSongPlayalbe: function(full_allowing,  from_collection, last_in_collection){
		if (!this.track && full_allowing){
			if (this.getRandomTrackName){
				this.getRandomTrackName(full_allowing, from_collection, last_in_collection);
			}
			
		} else{
			this.findFiles({
				only_cache: !full_allowing,
				collect_for: from_collection,
				last_in_collection: last_in_collection
			});
		}
	},
	checkRequestsPriority: function() {
		this.plst_titl.checkRequestsPriority();
	},
	getActingPriorityModels: function() {
		var result = [];
		if (this.next_song){
			result.push(this.next_song);
		} else if (this.plst_titl.state('has_loader')){
			result.push( this.plst_titl );
		} else if ( this.next_preload_song ){
			result.push( this.next_preload_song );
			
		}
		result.push( this );
		return result;
	},
	checkChangesSinceFS: function(opts){
		this.plst_titl.checkChangesSinceFS(this, opts);
	},
	view: function(no_navi, userwant){
		if (!this.state('mp_show')){
			this.trigger('view', no_navi, userwant);
		}
	},
	valueOf:function(){
		return (this.artist ? this.artist + ' - ' : '') + this.track;
	},
	isPossibleNeighbour: function(mo) {
		return this.isNeighbour(mo) || mo == this.next_preload_song;
	},
	isNeighbour: function(mo){
		return (mo == this.prev_song) || (mo == this.next_song);
	},
	setPlayableInfo: function(info){
		this.playable_info = info;
		return this;
	},
	posistionChangeInMopla: function(mopla){
		if (this.getCurrentMopla() == mopla){
			this.submitPlayed(true);
			this.submitNowPlaying();

			if (!this.start_time){
				this.start_time = (Date.now()/1000).toFixed(0);
			}
		}
	},
	getCurrentMopla: function(){
		return this.getMFCore().getCurrentMopla();
	},
	showArtcardPage: function(artist_name) {
		this.app.showArtcardPage(artist_name || this.artist);
		this.app.trackEvent('Artist navigation', 'art card', artist_name || this.artist);
	},
	showArtistSimilarArtists: function() {
		this.app.showArtistSimilarArtists(this.artist);
		this.app.trackEvent('Artist navigation', 'similar artists to', this.artist);
	}

});

return {};
});