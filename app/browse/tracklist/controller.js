'use strict';

angular.module('spotmop.browse.tracklist', [
	'spotmop.services.mopidy',
	'ngRoute'
])


.directive('track', function() {
	return {
		restrict: 'E',
		scope: {
			track: '='
		},
		templateUrl: '/app/browse/tracklist/track.template.html',
		link: function( $scope, element, attrs ){
			
			/*
			// not required because we're bypassing angular by using rude jQuery to handle selection events
			$scope.$on('spotmop:deleteKeyReleased', function(){
				if( $scope.
			});
			*/
		}
	}
})


.directive('tltrack', function() {
	return {
		restrict: 'E',
		scope: {
			track: '='
		},
		templateUrl: '/app/browse/tracklist/tltrack.template.html',
		link: function( $scope, element, attrs ){
			
			/*
			// not required because we're bypassing angular by using rude jQuery to handle selection events
			$scope.$on('spotmop:deleteKeyReleased', function(){
				console.log('dete');
			});
			*/
			
			// when track changed, let's comapre this track.tlid with the new playing track tlid
			// TODO: Figure out how to trigger this on load of the queue (because it currently loads without running this)
			$scope.$on('spotmop:currentTrackChanged', function( event, tlTrack ){
				if( tlTrack.tlid === $scope.track.tlid ){
					$scope.track.trackCurrentlyPlaying = true;
				}else{
					$scope.track.trackCurrentlyPlaying = false;
				}
			});
		}
	}
})

.controller('TracklistController', function TracklistController( $scope, $rootScope, $route, $routeParams, MopidyService, SpotifyService ){

	// setup switches to detect shift/control key holds
	var shiftKeyHeld = false;
	var ctrlKeyHeld = false;
	$('body').bind('keydown',function(evt){
		if( evt.which === 16 ){
			shiftKeyHeld = true;
		}else if( evt.which === 17 ){
			ctrlKeyHeld = true;
		}
	}).bind('keyup',function(evt){
		shiftKeyHeld = false;
		ctrlKeyHeld = false;
	});
	
	// when we SINGLE click on a track
	$scope.trackClicked = function( event ){
		
		// get the track row (even if we clicked a child element)
		var target = $(event.target);
		if( !target.hasClass('track') )
			target = target.closest('.track');
		
		// control click
		if( ctrlKeyHeld ){
			target.addClass('selected');		

		// shift click
		}else if( shiftKeyHeld ){
		
			// figure out the first in the list of highlighted
			var otherSelection = target.siblings('.selected').first();
			
			// then highlight either all up or all below the other selection
			if( otherSelection.index() < target.index() )
				otherSelection.nextUntil(target).add(target).addClass('selected');
			else
				target.nextUntil(otherSelection).add(target).addClass('selected');
		}else{
			// unhighlight all siblings
			target.siblings('.track').removeClass('selected');
			target.addClass('selected');		
		}
	}
	
	// when we DOUBLE click on a track
	$scope.trackDoubleClicked = function( event ){
		
		// get the track row (even if we clicked a child element)
		var target = $(event.target);
		if( !target.hasClass('track') )
			target = target.closest('.track');
		
		// play from queue
		if( target.closest('.tracklist').hasClass('queue-items') ){
            
			// get the queue
			MopidyService.getCurrentTlTracks().then( function( tracklist ){
				
				var tlTrack;
				
				// find our double-clicked track in the tracklist
				$.each( tracklist, function(key, track){
					
					if( track.tlid == target.attr('data-tlid') ){
				
                        // then play our track
                        return MopidyService.playTlTrack({ tl_track: track });
					}	
				});
			});
		
		// play from anywhere else
		}else{
			var trackToPlayIndex = target.index();
			var surroundingTracks = target.parent().children('.track');
			var newTracklistUris = [];
			
			$.each( surroundingTracks, function(key,value){
				newTracklistUris.push( $(value).attr('data-uri') );
			});
			
			MopidyService.playTrack( newTracklistUris, trackToPlayIndex );
		}
	}
    
    
    /**
     * Dragging of tracks
     **/
    var tracksBeingDragged = [];
    var dragging = false;
	var dragThreshold = 30;
	
	// when the mouse id pressed down on a .track
	$(document).on('mousedown', '.track', function(event){
	
		// get the .track row in question
		var track = $(event.currentTarget);
		if( !track.hasClass('track') )
			track = track.closest('.track');
	
		// get the sibling selected tracks too
		var tracks = track.siblings('.selected').andSelf();
		
		// create an object that gives us all the info we need
		dragging = {
					clientX: event.clientX,
					clientY: event.clientY,
					tracks: tracks
				}
	});
	
	// when we release the mouse, release dragging container
	$(document).on('mouseup', function(event){
		if( dragging ){
			dragging = false;
			$(document).find('.drag-tracer').html('Dropping...').fadeOut('fast');
		}
	});
	
	// when we move the mouse, check if we're dragging
	$(document).on('mousemove', function(event){
		if( dragging ){
			
			var left = dragging.clientX - dragThreshold;
			var right = dragging.clientX + dragThreshold;
			var top = dragging.clientY - dragThreshold;
			var bottom = dragging.clientY + dragThreshold;
			
			// check the threshold distance from mousedown and now
			if( event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom ){
				$(document).find('.drag-tracer')
					.show()
					.css({
						top: event.clientY-10,
						left: event.clientX+10
					})
					.html('Dragging '+dragging.tracks.length+' track(s)');
			}
		}
	});

});