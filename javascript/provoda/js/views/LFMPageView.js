define(['provoda', 'jquery', 'spv'], function(provoda, $, spv) {
"use strict";
/*
 {{player_song && 'player_song'}} 
 {{play && 'playing-song'}}
  {{marked_as && 'v-song-sibling'}} 
  {{marked_as == 'next' && 'to-play-next'}} 
  {{marked_as == 'prev' && 'to-play-previous'}} 
  {{vmp_show && 'viewing-song'}} 
  {{vis_lite_view && vmp_show && 'selected_song'}} 
 */




var song_string = '' +
'<span ' +
  'class="play_button fmppb" '+
  'pv-events="click:wantPlaying"'+
  'pv-class="play_button fmppb {{player_song && \'player_song\'}} {{!player_song && want_to_play && \'wanted_song\'}} "'+
  '>'+
  '<span class="searching_files-base" pv-class="searching_files-base {{searching_files && \'searching_files-progress\'}}">'+
  '  <span'+
  '    class="play_button_icon"'+
  '    pv-class=" '+
  '      play_button_icon '+
  '      {{player_song && play == \'play\' && \'pbicon-playing_song\'}}'+
  '      {{has_none_files_to_play && \'has-none-files\'}} '+
  '      {{!has_none_files_to_play && files_search.have_best_tracks && \'has_best_files\'}} '+
  '      {{!has_none_files_to_play && files_search.have_mp3_tracks && \'has-some-files\'}} "'+
  '    ></span>'+
  '</span>'+
  
' </span>';


var song_sample = {
	string: song_string,
	sampler: null,
	root_node: document.createElement('span')
};


var context_artist_string = '' +
'<span ' +
  'class="play_button fmppb" '+
  'pv-events="click:wantPlaying"'+
  '>'+
  '  <span'+
  '    class="play_button_icon"'+
  '    ></span>'+
  '</span>'+
  
' </span>';

var context_artist_sample = {
	string: context_artist_string,
	sampler: null,
	root_node: document.createElement('span')
};

var getSample = function(obj, PvTemplate) {
	if (!obj.sampler) {
		if (obj.string) {
			song_sample.root_node.innerHTML = song_sample.string;
		}
		obj.sampler = new PvTemplate.SimplePVSampler(song_sample.root_node);
	}

	return $(obj.sampler.getClone());
};
/*

sampler = this.samples[sample_name] = new PvTemplate.SimplePVSampler(sample_node);
if (sampler.getClone){
	return $(sampler.getClone());
}
*/


var SongView = function() {};
provoda.View.extendTo(SongView, {
	createBase: function() {
		this.c = getSample(song_sample, this.PvTemplate);
		this.createTemplate();
		var outside_comment_node = spv.getTargetField(this.root_view.dom_storage.songs, [this.parent_view.state('item_num'), this.undetailed_states.item_num]);
		$(outside_comment_node).after(this.c);
	},
	tpl_events: {
		wantPlaying: function() {
			this.RPCLegacy('wantSong');
			this.RPCLegacy('requestPage');
			this.RPCLegacy('switchPlay');
		}
	}
});

var ContextArtistView = function() {};
provoda.View.extendTo(ContextArtistView, {
	createBase: function() {
		this.c = getSample(context_artist_sample, this.PvTemplate);
		this.createTemplate();
		var outside_comment_node = spv.getTargetField(this.root_view.dom_storage.artists, [this.undetailed_states.context_id]);
		$(outside_comment_node).after(this.c);



	},
	tpl_events: {
		wantPlaying: function() {
			this.RPCLegacy('wantPlaying');

		}
	}
});


var PlaylistView = function() {};
provoda.View.extendTo(PlaylistView, {
	children_views: {
		'songs-list': SongView
	},
	'collch-songs-list': true
});
/*
function(nesting_name, array) {
		console.log(this.root_view.dom_storage, array);
	}
	*/



var LFMPageView = function() {};
provoda.View.extendTo(LFMPageView, {
	manual_states_connect: true,
	location_name: 'root_view',
	createDetails: function() {
		this.root_view = this;
		this.dom_storage = this.opts.dom_storage;
		this.completeDomBuilding();
	},
	completeDomBuilding: function() {
		this.connectStates();
		this.connectChildrenModels();
		this.requestAll();
	},
	children_views: {
		main_list: PlaylistView,
		artists_list: ContextArtistView
	},

	'collch-main_list': true,
	'collch-artists_list': true
	
});

return LFMPageView;
});