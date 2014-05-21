require([
	'JSMessages',
	'wikia.cookies',
	'wikia.tracker',
	'jquery',
	'wikia.querystring',
	'wikia.window'
], function(msg, cookies, tracker, $, Querystring, window){
	/**
	 * If the pageview is generated by a device that is touch capable
	 */

	var linksWrapper = $('.CorporateFooter ul').first();

	if(Wikia.isTouchscreen() && linksWrapper.exists()){
		msg.get('Oasis-mobile-switch').then(function(){
			var mobileSwitch = $('<li><a href="#">' + msg('oasis-mobile-site') + '</a></li>');

			mobileSwitch.on('click', function(ev){
				ev.preventDefault();
				ev.stopPropagation();

				cookies.set('useskin', 'wikiamobile', {
					domain: window.wgCookieDomain,
					path: window.wgCookiePath
				});

				tracker.track({
					category: 'corporate-footer',
					action: tracker.ACTIONS.CLICK_LINK_BUTTON,
					label: 'mobile-switch',
					trackingMethod: 'both'
				});


				Querystring().setVal('useskin', 'wikiamobile').addCb().goTo();
			});

			linksWrapper.append(mobileSwitch);
		});
	}
	// Support clicking on whole language flag button, not only the flag itself
	$( function() {
		$( '.wikiahomepage-footer' ).on( 'click', '.wikia-menu-button.secondary li', function ( event ) {
			// check if our target is really the event's target we would like to invoke - in order to avoid incidental
			// calling of event handler from child elements
			if ( event.target === this ) {
				event.stopPropagation();
				$( this ).children( 'a' ).get( 0 ).click();
			}
		} );
	} );
});
