'use strict';

angular.module('spotmop.services.pusher', [
])

.factory("PusherService", function($rootScope, $http, $q, $localStorage, $cacheFactory, $templateCache, SettingsService, NotifyService){

	// make sure we have a local storage container
	if( typeof( $localStorage.pusher ) === 'undefined' )
		$localStorage.pusher = {};
		
	// build the endpoint string
	var mopidyhost = SettingsService.getSetting("mopidy.host");
	if( !mopidyhost ) mopidyhost = window.location.hostname;
	var mopidyport = SettingsService.getSetting("mopidy.port");
	if( !mopidyport ) mopidyport = "6680";
	
	var urlBase = 'http://'+ mopidyhost +':'+ mopidyport +'/spotmop/';
    
	var service = {
		pusher: {},
		
		isConnected: false,
		
		start: function(){
            var self = this;

            // Get mopidy/pusher ip and port from settigns
			var pusherhost = SettingsService.getSetting("mopidy.host");
			if( !pusherhost ) pusherhost = window.location.hostname;
			var pusherport = SettingsService.getSetting("pusher.port");
			if( !pusherport ) pusherport = "6681";
			
            try{
				var host = 'ws://'+pusherhost+':'+pusherport+'/pusher';
				var pusher = new WebSocket(host);

				pusher.onopen = function(){
					$rootScope.$broadcast('spotmop:pusher:online');
					this.isConnected = true;
				}

				pusher.onmessage = function( response ){
                    
					var data = JSON.parse(response.data);
					
					// if this is a pusher message (because Mopidy uses websockets too!)
					if( data.pusher ){
					
                        // if it's an initial connection status message, just parse it through quietly
                        if( data.startup ){
                            console.info('Pusher connected as '+data.details.id);
                            SettingsService.setSetting('pusher.id', data.details.id);
                            SettingsService.setSetting('pusher.ip', data.details.ip);
								
                            // detect if the core has been updated
                            if( SettingsService.getSetting('version.installed') != data.version ){
                                NotifyService.notify('New version detected, clearing caches...');      
                                $cacheFactory.get('$http').removeAll();
                                $templateCache.removeAll();
                                SettingsService.setSetting('version.installed', data.version);
								SettingsService.runUpgrade();
                            }
							
                            // notify server of our actual username
                            var name = SettingsService.getSetting('pusher.name')
                            if( name ) service.setMe( name );
                        
                        // standard notification, fire it out!
                        }else{
                            // make sure we're not notifying ourselves
                            if( data.id != SettingsService.getSetting('pusher.id') && !SettingsService.getSetting('pusher.disabled') )
                                $rootScope.$broadcast('spotmop:pusher:received', data);
                        }
					}
				}

				pusher.onclose = function(){
					$rootScope.$broadcast('spotmop:pusher:offline');
					service.isConnected = false;
                    setTimeout(function(){ service.start() }, 5000);
				}
				
				service.pusher = pusher;
            }catch(e){
                // need to re-initiate notifier
				console.log( "Connecting with Pusher failed with the following error message: " + e);
            }
		},
		
		stop: function() {
			this.pusher = null;
			this.isConnected = false;
		},
		
		send: function( data ){
			data.pusher = true;
			data.id = SettingsService.getSetting('pusher.id');
			service.pusher.send( JSON.stringify(data) );
		},
        
        /**
         * Notify the Pusher service of our name
         * @param name (string)
         * @return deferred promise
         **/
        setMe: function( name ){
            var id = SettingsService.getSetting('pusher.id');
            $.ajax({
                method: 'GET',
                cache: false,
                url: urlBase+'pusher/me?id='+id+'&name='+name
            });
        },
        
        /**
         * Get a list of all active connections
         **/
        getConnections: function(){
            var deferred = $q.defer();
            $http({
                    method: 'GET',
                    cache: false,
                    url: urlBase+'pusher/connections'
				})
                .success(function( response ){					
                    deferred.resolve( response );
                })
                .error(function( response ){					
					NotifyService.error( response.error.message );
                    deferred.reject( response.error.message );
                });				
            return deferred.promise;
        }
	};
    
    return service;
});
