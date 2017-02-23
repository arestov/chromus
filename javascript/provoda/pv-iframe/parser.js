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
	return window.document.createComment(text || comments_counter++);
};

var prependNode = function(target, elem) {
		target.insertBefore( elem, target.firstChild );
};
var insertBefore = function(target, elem) {
		if (target.parentNode) {
				target.parentNode.insertBefore( elem, target);
		}
};

var afterNode = function(target, elem) {
  if (target.nextSibling) {
    insertBefore(target.nextSibling, elem);
  } else {
    target.parentNode.appendChild(elem);
  }
};
// var emptyNode = function(elem) {
// 		while ( elem.firstChild ) {
// 				elem.removeChild( elem.firstChild );
// 		}
// };

var dom_parts = {
  'similar-assort': function (doc) {
    return doc.querySelectorAll('.similar-tracks-and-artists-row section');
  },
  'recs': function (doc) {
    return doc.querySelectorAll('.recs-feed');
  },
  'grid-sections': function (doc) {
    return doc.querySelectorAll('section.grid-items-section');
  },
  'featured': function (doc) {
    return doc.querySelectorAll('.featured-releases-col');
  }
};

var getPart = function (doc, common, name) {
  if (common.hasOwnProperty(name)) {
    return common[name];
  }
  return (common[name] = dom_parts[name].call(null, doc, common));
};

// views_storage.songs[playlist_num] = dom_index;

var detectors = [
	['playlists', function(doc, common) {
		var result = [];

		var charts = doc.querySelectorAll('.chartlist');

		for (var i = 0; i < charts.length; i++) {

			var cur = charts[i];
			var item_name_node = cur.querySelectorAll('.chartlist-name');

			var dom_index = {};

			var playlist_array = [];

			for (var jj = 0; jj < item_name_node.length; jj++) {
				var cur_node = item_name_node[jj];

				var track_name_node = cur_node.querySelector('.link-block-target');
				var artists_node = cur_node.querySelector('.chartlist-artists');

				var comment = anchor();

        var td_node = doc.createElement('td');
        td_node.className = 'play_button_td_wrap';
        td_node.appendChild(comment);
        afterNode(track_name_node.parentNode.parentNode.parentNode.querySelector('.chartlist-play'), td_node);


				dom_index[jj] = comment;

				var track_name = track_name_node.textContent.trim();
				var artist_name = artists_node ? artists_node.textContent.trim() : common.possible_page_artist;

				playlist_array.push([artist_name, track_name]);
			}


			// collected_data.playlists.push(playlist);
			// views_storage.songs[playlist_id] = dom_index;
      var playlist_id = playlists_counter++;
			result.push({
				id: playlist_id,
				data: [playlist_id, playlist_array],
				view: dom_index
			});
			// playlist.push();
		}


		return result;
	}],
	['artists', function(doc) {
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
      if (cur_node.getAttribute('data-ad-container') === '') {
        continue;
      }
			var album_name = getText(cur_node, '.album-grid-item-main-text, .grid-items-item-main-text a');
      if (!album_name) {
        continue;
      }

			var comment = anchor();
      cur_node.appendChild(comment);

			var id = albums_counter++;

			result.push({
				id: id,
				data: [id, common.possible_page_artist, album_name],
				view: comment
			});
		}

		return result;
	}],
  ['albums', function (doc, common) {
    var result = [];
    var con = getPart(doc, common, 'recs');

    con.forEach(function (el) {
      el.querySelectorAll('li').forEach(function ($0) {

        if (!$0.matches('.recs-feed-item--album')) {
          return;
        }

        var artist_name = getText($0, '.recs-feed-description a');
        var album_name = getText($0, '.recs-feed-title a');

        if (!artist_name || !album_name) {
          return;
        }

        var comment = anchor();
				$0.querySelector('.recs-feed-inner-wrap').appendChild(comment);

        var id = albums_counter++;

  			result.push({
  				id: id,
  				data: [id, artist_name, album_name],
  				view: comment
  			});
        //
      });
    });

    return result;
  }],

  ['artists', function (doc, common) {
    var result = [];
    var con = getPart(doc, common, 'recs');

    con.forEach(function (el) {
      el.querySelectorAll('li').forEach(function ($0) {

        if (!$0.matches('.recs-feed-item--artist')) {
          return;
        }

        var artist_name = getText($0, '.recs-feed-title a');
        if (!artist_name) {
          return;
        }

        var comment = anchor();
				$0.querySelector('.recs-feed-inner-wrap').appendChild(comment);

        var id = artists_counter++;

  			result.push({
  				id: id,
  				data: [id, artist_name],
  				view: comment
  			});
        //
      });
    });

    return result;
  }],
  ['playlists', function (doc, common) {
    var result = [];
    var con = getPart(doc, common, 'recs');


    con.forEach(function (el) {
      var playlist_array = [];
      var dom_index = {};
      var counter = 0;

      el.querySelectorAll('li').forEach(function ($0) {
        if (!$0.matches('.recs-feed-item--track')) {
          return;
        }

        var artist_name = getText($0, '.recs-feed-description a');
				var track_name_node = $0.querySelector('.recs-feed-title a');
        var track_name_raw = track_name_node && track_name_node.textContent.trim();
				var duration_text = getText(track_name_node, '.recs-feed-title-duration');
				var track_name = duration_text ? track_name_raw.replace(duration_text, '') : track_name_raw;

        if (!artist_name || !track_name) {
          return;
        }

        var comment = anchor();
				$0.querySelector('.recs-feed-inner-wrap').appendChild(comment);
        dom_index[counter++] = comment;

        playlist_array.push([artist_name, track_name]);
      });

      var playlist_id = playlists_counter++;
      result.push({
        id: playlist_id,
        data: [playlist_id, playlist_array],
        view: dom_index
      });
    });
    return result;
  }],
  ['playlists', function (doc, common) {
    var result = [];
    var wrap = getPart(doc, common, 'grid-sections');

    wrap.forEach(function (el) {
      var header = getText(el, 'h2');
      el.querySelector('h2');
      if (!header || header.toLowerCase().indexOf('tracks') == -1) {
        return;
      }
      var con = el;

      var playlist_array = [];
      var dom_index = {};
      var counter = 0;

      con.querySelectorAll('li').forEach(function ($0) {
        var artist_name = getText($0, '.grid-items-item-aux-text');
        var track_name = getText($0, '.grid-items-item-main-text');

        if (!artist_name || !track_name) {
          return;
        }

        var comment = anchor();
				$0.appendChild(comment);
        dom_index[counter++] = comment;

        playlist_array.push([artist_name, track_name]);
      });

      var playlist_id = playlists_counter++;
      result.push({
        id: playlist_id,
        data: [playlist_id, playlist_array],
        view: dom_index
      });
    });
    return result;
  }],
  ['artists', function (doc, common) {
    var result = [];
    var wrap = getPart(doc, common, 'grid-sections');

    wrap.forEach(function (el) {
      var res = artistsFromGrid(el);
      if (!res) {return;}
      result = result.concat(res);
    });
    return result;
  }],
  ['albums', function (doc, common) {
    var result = [];
    var wrap = getPart(doc, common, 'grid-sections');

    wrap.forEach(function (el) {
      var res = albumsFromGrid(el);
      if (!res) {return;}
      result = result.concat(res);
    });
    return result;
  }],
  ['albums', function (doc, common) {
    var result = [];
    var con = getPart(doc, common, 'featured');

    con.forEach(function (el) {
      var name_node = el.querySelector('.featured-release-name a');
      if (!name_node) {return;}


      var path_parts = name_node.pathname.split('/');
      if ((path_parts[1] !== 'music') || (path_parts.length != 4) || !path_parts[3] || path_parts[3] == '_') {
        return;
      }

      var artist_name = common.possible_page_artist;
      var album_name = name_node.textContent.trim();
      if (!artist_name || !album_name) {
        return;
      }

      var comment = anchor();
      el.querySelector('.featured-release').appendChild(comment);

      var id = albums_counter++;
      result.push({
        id: id,
        data: [id, artist_name, album_name],
        view: comment
      });
    });

    return result;
  }],
  ['playlists', function (doc, common) {
    var result = [];
    var con = getPart(doc, common, 'featured');

    con.forEach(function (el) {
      var name_node = el.querySelector('.featured-release-name a');
      if (!name_node) {return;}


      var path_parts = name_node.pathname.split('/');
      if ((path_parts[1] !== 'music') || (path_parts.length != 5) || !path_parts[4] || path_parts[3] != '_') {
        return;
      }

      var artist_name = common.possible_page_artist;
      var track_name = name_node.textContent.trim();
      if (!artist_name || !track_name) {
        return;
      }


      var comment = anchor();
      el.querySelector('.featured-release').appendChild(comment);

      var playlist_array = [[artist_name, track_name]];
      var dom_index = {'0': comment};

      var playlist_id = playlists_counter++;
      result.push({
        id: playlist_id,
        data: [playlist_id, playlist_array],
        view: dom_index
      });
    });

    return result;
  }],
  ['playlists', function (doc) {
    var result = [];

    var con = doc.querySelector('.featured-track-body');
    if (!con) {return;}

    var artist_name = getText(con, '.metadata-display');
    var track_name = getText(con, '.featured-track-subtitle');
    if (!artist_name || !track_name) {
      return;
    }

    var comment = anchor();
    prependNode(con, comment);

    var playlist_array = [[artist_name, track_name]];
    var dom_index = {'0': comment};

    var playlist_id = playlists_counter++;
    result.push({
      id: playlist_id,
      data: [playlist_id, playlist_array],
      view: dom_index
    });

    return result;
  }]
];

function albumsFromGrid(el) {
  var result = [];

  var header = getText(el, 'h2');
  el.querySelector('h2');
  if (!header || header.toLowerCase().indexOf('albums') == -1) {
    return;
  }
  var con = el;

  con.querySelectorAll('li').forEach(function ($0) {
    var artist_name = getText($0, '.grid-items-item-aux-text');
    var album_name = getText($0, '.grid-items-item-main-text');
    if (!album_name) {
      return;
    }

    var comment = anchor();
    $0.appendChild(comment);

    var id = albums_counter++;
    result.push({
      id: id,
      data: [id, artist_name, album_name],
      view: comment
    });
  });

  return result;
}

function artistsFromGrid(el) {
  var result = [];

  var header = getText(el, 'h2');
  el.querySelector('h2');
  if (!header || header.toLowerCase().indexOf('artists') == -1) {
    return;
  }
  var con = el;

  con.querySelectorAll('li').forEach(function ($0) {
    var artist_name = getText($0, '.grid-items-item-main-text');
    if (!artist_name) {
      return;
    }

    var comment = anchor();
    $0.appendChild(comment);

    var id = artists_counter++;

    result.push({
      id: id,
      data: [id, artist_name],
      view: comment
    });
  });

  return result;
}

function getText(con, selector) {
  var node = con.querySelector(selector);
  return node && node.textContent.trim();
}

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

  var tealium_data_raw = tealium && tealium.getAttribute('data-tealium-data');
  var tealium_data;
  try {
    tealium_data = tealium_data_raw && JSON.parse(tealium_data_raw);
  } catch (e) {}

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


	var page_title = getText(doc, 'header .header-info .header-info-primary .header-title');
	var page_crumb = getText(doc, 'header .header-info .header-info-primary .header-crumb');

  var page_artist = tealium_data.musicArtistName || page_crumb || page_title;

	var common = {
		tealium: tealium,
    tealium_data: tealium_data,
		title: page_title,
		crumb: page_crumb,
    possible_page_artist: page_artist,
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
		var parsed;
    try {
      parsed= func(doc, common);
    } catch (e) {
      console.log(e);
      debugger;
    }

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
