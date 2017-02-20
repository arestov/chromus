define([], function(){
'use strict';

var comments_counter = 1;

var playlists_counter = 1;
var artists_counter = 1;
var albums_counter = 1;

// var collected_data = {
// 		playlists: [],
// 		artists: [],
// 		albums: []
// };
//
// var views_storage = {
// 		playlists: {},
// 		artists: {},
// 		albums: {}
// };

var anchor = function(text) {
	return document.createComment(text || comments_counter++);
};

var prependNode = function(target, elem) {
		target.insertBefore( elem, target.firstChild );
};
var insertBefore = function(target, elem) {
		if (target.parentNode) {
				target.parentNode.insertBefore( elem, target);
		}
};

var afterNode = function(target) {};
var emptyNode = function(elem) {
		while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
		}
};

// views_storage.songs[playlist_num] = dom_index;

var detectors = [
	['playlists', function(doc, common) {
		var result = [];

		var tealium = common.tealium;
		var page_header_title = common.title;
		var page_header_crumb = common.crumb;

		var is_artist = // tealium.getAttribute('data-page-type') === 'artist_door' &&
			tealium.getAttribute('data-music-artist-name');

		var page_artist = is_artist || page_header_crumb || page_header_title;

		var charts = doc.querySelectorAll('.chartlist');

		for (var i = 0; i < charts.length; i++) {
			var playlist_id = playlists_counter++;

			var cur = charts[i];
			var item_name_node = cur.querySelectorAll('.chartlist-name');

			var dom_index = {};

			var playlist_array = [];

			for (var jj = 0; jj < item_name_node.length; jj++) {
				var cur = item_name_node[jj];

				var track_name_node = cur.querySelector('.link-block-target');
				var artists_node = cur.querySelector('.chartlist-artists');

				var comment = anchor();

				var play_con = track_name_node.parentNode.parentNode.parentNode.querySelector('.chartlist-play');

				prependNode(play_con, comment);

				dom_index[jj] = comment;

				var track_name = track_name_node.textContent.trim();
				var artist_name = artists_node ? artists_node.textContent.trim() : page_artist;

				playlist_array.push([artist_name, track_name]);
			}

			
			var playlist = [playlist_id, playlist_array];
			// collected_data.playlists.push(playlist);
			// views_storage.songs[playlist_id] = dom_index;

			result.push({
				id: playlist_id,
				data: playlist,
				view: dom_index
			});
			// playlist.push();
		}
		

		return result;
	}],
	['artists', function(doc, common) {
		var result = [];


		var artists = doc.querySelectorAll('.grid-items-item--artist,' + 
			'.selectable-range[data-selectable-range-selectbox=top_artists] .grid-items-item');
		for (var i = 0; i < artists.length; i++) {
			var cur_node = artists[i];
			var text_node = cur_node.querySelector('.grid-items-item-main-text a');
			var artist_name = text_node && text_node.textContent;
			if (!artist_name) {continue;}

			var comment = anchor();

			cur_node.appendChild(comment);

			var id = artists_counter++; 

			result.push({
				id: id,
				data: [id, artist_name],
				view: comment
			});
		}

		return result;

	}],
	['albums', function(doc, common) {
		var result = [];

		var albums = doc.querySelectorAll('.album-grid-item,' + 
			'.selectable-range[data-selectable-range-selectbox=top_albums] .grid-items-item');

		for (var i = 0; i < albums.length; i++) {
			var cur_node = albums[i];



			var text_node = cur_node.querySelector('.album-grid-item-main-text, .grid-items-item-main-text a');

			var page_header_title = common.title;
			var page_header_crumb = common.crumb;
			var page_artist = page_header_crumb || page_header_title;

			var album_name = text_node.textContent.trim();

			var comment = anchor();
			var id = albums_counter++;

			cur_node.appendChild(comment);

			result.push({
				id: id,
				data: [id, page_artist, album_name],
				view: comment
			});
		}

		return result;
	}]
];

 // album-grid-item

// var types = {
// 	playlists: function(doc, common, storage, func) {
//
//
// 	},
// 	artists: function(doc, common, storage, func) {
//
// 	},
// 	albums: function(doc, common, storage, func) {
//
// 	}
// };

return function(doc, views) {
	var tealium = doc.getElementById('tlmdata');
	/*
		data-environment="prod"
		data-site-section="music"
		data-page-type="artist_door"
		data-page-name="music/artist/overview"
		data-music-artist-name="Beastie Boys"
		
		
		
		data-user-state="not authenticated"
		data-user-type="anon"
		data-device-type="desktop"
	*/
	var page_title = doc.querySelector('header .header-info .header-info-primary .header-title');
	var page_crumb = doc.querySelector('header .header-info .header-info-primary .header-crumb');
	var common = {
		tealium: tealium,
		title: page_title && page_title.textContent.trim(),
		crumb: page_crumb && page_crumb.textContent.trim()
	};

	var storage = {
		data: {},
		views: views || {}
	};

	for (var i = 0; i < detectors.length; i++) {
		var cur = detectors[i];
		var type = cur[0];
		var func = cur[1];


		if (!storage.data[type]) {
			storage.data[type] = [];
		}

		if (!storage.views[type]) {
			storage.views[type] = {};
		}

		// storage = types[type](doc, common, storage, func);




		var parsed = func(doc, common);
		if (!parsed) {continue;}

		for (var jj = 0; jj < parsed.length; jj++) {
			var parsed_cur = parsed[jj];

			var id = parsed_cur.id;
			var data = parsed_cur.data;
			var view = parsed_cur.view;

			storage.data[type].push(data);
			storage.views[type][id] = view;			
		}
		// return storage;
	}

	return storage;

	// window.collected_data = storage.data;
	// window.views_storage = storage.views;

	// return collected_data;
};
});
