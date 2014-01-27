define(['provoda', 'jquery', 'spv', 'hex_md5', 'app_serv'], function(provoda, $, spv, hex_md5, app_serv){
"use strict";


var AsyncDataSteam = function(getDataFunc, freshness, interval, data){
	this._getDataFunc = getDataFunc;
	this._interval = interval;
	this._freshness = freshness;
	
	if (data){
		this._store = data;
	} else{
		this._store = false;
	}
	
	this._processing = false;
	this._timestamp = false;
	this._callbacks = {};
	this._onetime_callbacks = [];
	
};
AsyncDataSteam.prototype = {
	_request: function(){
		if (this._getDataFunc){
			var _this = this;
		
			this._processing = true;
			
			this._fireCallbacks();
			
			this._getDataFunc(function(r){
				_this.setNewData(r);
				
				_this._processing = false;
			});
		}
	
	},
	setNewData: function(data){
		this._timestamp = 1*(new Date());
		this._store = data;
		this._fireCallbacks(true);
	},
	init: function(){
		if (!this._inited){
			var _this = this;
			
			if (this._interval){
				setInterval(function(){
					_this._request();
				}, this._interval);
			}
			
			
			this._request();
			
			this._inited = true;
		}
		
		
	},

	getData: function(callback, force_newdata, loading_marking){
		
		if (!force_newdata && callback && this._freshness && this._store && (this._timestamp + this._freshness > (1* new Date()))){
			callback(this._store);
		} else{
			if (callback){
				this.regCallback(false, callback, loading_marking);
			}
			
			if (!this._processing){
				this._request();
			}
		}
	},
	removeCallback: function(key, cb) {
		if (this._callbacks[key] && this._callbacks[key].cb === cb){
			this._callbacks[key] = null;
		}

	},
	regCallback: function(key, cb, lcb){
	
		if (key){
			if (cb){
				this._callbacks[key] = {cb: cb, lcb: lcb};
				if (this._store){
					var _this = this;
					setTimeout(function(){
						cb(_this._store);
					},10);
					
				}
			} else{
				delete this._callbacks[key];
			}
		} else{
			if (cb){
				this._onetime_callbacks.push({cb: cb, lcb: lcb});
			}
			
		}

	},
	_fireCallbacks: function(real){//real callbacks or just loading marks
		var f;
		for (var a in this._callbacks) {
			f = this._callbacks[a];
			if (!f){
				continue;
			}
			f = real ? f.cb : f.lcb;
			if (f){f(this._store);}
		}
		for (var i = this._onetime_callbacks.length - 1; i >= 0; i--){
			f = this._onetime_callbacks.pop();
			if (!f){
				continue;
			}
			f = real ? f.cb : f.lcb;
			if (f){f(this._store);}
		}
	}
};

var SeesuServerAPI = function(app, auth, url){
	this.app = app;
	this.init();
	var _this = this;
	
	this.url  = url;
	if (auth){
		this.setAuth(auth, true);
	}
	
	var update_interval = 1000 * 60 * 4;
	
	this.susd.rl = new AsyncDataSteam(function(callback){
		_this.api('relations.getLikes', function(r){
			_this.susd.updateRelationsLikes(r.done);
			if (callback){callback(r);}
		});
	}, update_interval,  update_interval);
	
	this.susd.ri = new AsyncDataSteam(function(callback){
		_this.api('relations.getInvites', function(r){
			_this.susd.updateRelationsInvites(r.done);
			if (callback){callback(r);}
		});
	}, update_interval,  update_interval);

	this.auth.regCallback('relations.likes', function(){
		_this.susd.rl.init();
		_this.susd.ri.init();
	});
	
	
	this.susd.ligs =  new AsyncDataSteam(function(callback){
		$.ajax({
			url: _this.url + 'last_listenings/',
			type: "GET",
			dataType: "json",
			error: function(){
				callback();
			},
			success: function(r){
				callback(r);
			}
		});
	}, update_interval,  update_interval);
	spv.domReady(window.document, function(){
		_this.susd.ligs.init();
	});
	
};

provoda.Eventor.extendTo(SeesuServerAPI, {
	susd: {
		rl: false,
		ri: false,
		ligs: false,
		relations:{
			likes: {},
			invites: {}
		},
		addLike: function(user){
			if (!this.relations.likes[user]){
				this.relations.likes[user] = [{}];
			}
		},
		addInvite: function(user){
			if (!this.relations.likes[user]){
				this.relations.likes[user] = [{}];
			}
		},
		updateRelationsInvites: function(invites){
			this.relations.invites = spv.makeIndexByField(invites, 'user');
		},
		updateRelationsLikes: function(likes){
			this.relations.likes = spv.makeIndexByField(likes, 'user');
		},
		didUserInviteMe: function(user){
			var rel = this.relations.invites[user];
			return rel && rel[0];
		},
		isUserLiked: function(user){
			var rel = this.relations.likes[user];
			return rel && rel[0];
		},
		user_info: {}
	},
	auth: new AsyncDataSteam(false, false, false),
	getInfo: function(type){
		return this.susd.user_info[type];
	},
	setInfo: function(type, data){
		this.susd.user_info[type] = data;
		this.trigger('info-change.' + type, data);
	},

	
	getId: function(){
		return this.auth._store && this.auth._store.userid;
	},
	loggedIn: function(){
		var auth = this.auth._store;
		return !!(auth.secret && auth.sid && auth.userid);
	},

	setAuth: function(auth_data, not_save){

		if (!not_save){
			app_serv.store('dg_auth', auth_data, true);
		}
		this.auth.setNewData(auth_data);
		this.app.updateState('su_userid', auth_data.userid);
	},

	getAuth: function(vk_user_id, callback){
		var _this = this;
		this.api('user.getAuth', {
			type:'vk',
			ver: 0.3,
			vk_user: vk_user_id
		}, function(su_sess){
			if (su_sess.secret_container && su_sess.sid){
				_this.app.vk_api.get('storage.get', {key:su_sess.secret_container})
					.done(function(r){
						if (r && r.response){
							_this.setAuth({
								userid: su_sess.userid,
								secret: r.response,
								sid: su_sess.sid
							});
							//su.s.setInfo('vk', su.vk.user_info);

							//su.s.api('user.update', su.vk.user_info);
							_this.app.trigger('dg-auth');
							
							if (callback){callback();}
						}
					});
			}
			
		});
	},
	api: function(method, p, c, error){
		var params = (typeof p == 'object' && p) || {};
		var callback = c || (typeof p == 'function' && p);
		var _this = this;
		
	
		params.method = method;
		
		var auth = this.auth._store;
		
		
		if (['track.getListeners', 'user.getAuth'].indexOf(method) == -1){
			if (!auth){
				return false;
			} else {
				params.sid = auth.sid;
				params.sig = hex_md5(spv.stringifyParams(params, ['sid']) + auth.secret);
			}
			
		}
		
		$.ajax({
			type: "GET",
			url: _this.url + 'api/',
			data: params,
			success: function(r){
				if (r){
					if (r.error && r.error[0]  && r.error[0] == 'wrong signature'){
						
						//_this.setAuth('');
						//_this.getAuth(_this.vk_id);
						
						
						
						
					} else{
						if (callback){callback(r);}
					}
				}
				
			},
			error: error
		});
		
	}
});



return SeesuServerAPI;
});