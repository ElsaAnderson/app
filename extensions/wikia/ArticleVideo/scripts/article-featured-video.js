require([
	'wikia.window',
	'wikia.onScroll',
	'wikia.tracker',
	'ooyala-player',
	'wikia.cookies',
	'wikia.geo',
	'wikia.instantGlobals',
	'wikia.articleVideo.videoFeedbackBox',
	require.optional('ext.wikia.adEngine.video.player.ooyala.ooyalaTracker'),
	require.optional('ext.wikia.adEngine.video.ooyalaAdSetProvider')
], function (
	window,
	onScroll,
	tracker,
	OoyalaPlayer,
	cookies,
	geo,
	instantGlobals,
	VideoFeedbackBox,
	playerTracker,
	ooyalaAdSetProvider
) {

	$(function () {
		var $video = $('#article-video'),
			$videoContainer = $video.find('.video-container'),
			$videoThumbnail = $videoContainer.find('.video-thumbnail'),
			$onScrollVideoTitle = $videoContainer.find('.video-title'),
			$onScrollVideoTime = $videoContainer.find('.video-time'),
			$onScrollAttribution = $videoContainer.find('.featured-video__attribution-container'),
			$closeBtn = $videoContainer.find('.close'),
			ooyalaVideoController,
			ooyalaVideoElementId = 'ooyala-article-video',
			$ooyalaVideo = $('#' + ooyalaVideoElementId),
			videoCollapsed = false,
			collapsingDisabled = false,
			playTime = -1,
			percentagePlayTime = -1,
			playerTrackerParams = {
				adProduct: 'featured-video-preroll',
				slotName: 'FEATURED'
			},
			track = tracker.buildTrackingFunction({
				category: 'article-video',
				trackingMethod: 'analytics'
			}),
			collapsedVideoSize = {
				width: 300,
				height: 169
			},
			correlator = Math.round(Math.random() * 10000000000),
			videoData = window.wgFeaturedVideoData,
			videoId = videoData.videoId,
			videoTitle = videoData.title,
			videoLabels = (videoData.labels || '').join(','),
			recommendedLabel = videoData.recommendedLabel,
			videoFeedbackBox,
			inAutoplayCountries = geo.isProperGeo(instantGlobals.wgArticleVideoAutoplayCountries),
			inNextVideoAutoplayCountries = geo.isProperGeo(instantGlobals.wgArticleVideoNextVideoAutoplayCountries),
			autoplayCookieName = 'featuredVideoAutoplay',
			willAutoplay = cookies.get(autoplayCookieName) !== '0' && inAutoplayCountries,
			autoplayOnLoad = willAutoplay && !document.hidden,
			initialPlayTriggered = false,
			recommendedVideoDepth = 0;

		function initVideo(onCreate) {
			var inlineSkinConfig = {
					controlBar: {
						autoplayCookieName: autoplayCookieName,
						autoplayToggle: inAutoplayCountries
					},
					discoveryScreen: {
						showCountDownTimerOnEndScreen: inNextVideoAutoplayCountries
					}
				},
				options = {
					pcode: window.wgOoyalaParams.ooyalaPCode,
					playerBrandingId: window.wgOoyalaParams.ooyalaPlayerBrandingId,
					videoId: videoId,
					autoplay: autoplayOnLoad,
					inlineSkinConfig: inlineSkinConfig,
					recommendedLabel: recommendedLabel
				};

			if (ooyalaAdSetProvider.canShowAds()) {
				options.adSet = ooyalaAdSetProvider.get(1, correlator, {
					contentSourceId: videoData.dfpContentSourceId,
					videoId: videoId
				});
				options.replayAds = ooyalaAdSetProvider.adsCanBePlayedOnNextVideoViews();
			} else {
				playerTrackerParams.adProduct = 'featured-video-no-preroll';
			}

			if (playerTracker) {
				playerTracker.track(playerTrackerParams, 'init');
			}

			ooyalaVideoController = OoyalaPlayer.initHTML5Player(ooyalaVideoElementId, options, onCreate);

			document.addEventListener('visibilitychange', handleTabChange);
		}

		function handleTabChange() {
			if (!document.hidden && !initialPlayTriggered && willAutoplay) {
				ooyalaVideoController.player.play();
			}
		}

		function collapseVideo(videoOffset, videoHeight) {
			var videoWidth = $video.outerWidth(),
				viewportWidth = $(window).width(),
				viewportHeight = $(window).height();

			collapsingDisabled = false;
			videoCollapsed = true;
			$video.addClass('is-collapsed-ready');
			if (ooyalaVideoController) {
				updatePlayerControls(true);
			}
			$videoContainer.css({
				'bottom': viewportHeight - videoOffset.top - videoHeight + $(window).scrollTop(),
				'right': viewportWidth - videoOffset.left - videoWidth,
				'width': videoWidth
			});
			$videoThumbnail.css('height', videoHeight);
			$ooyalaVideo.css('height', videoHeight);
			setTimeout(function () {
				if (videoCollapsed) { // we need to be sure video has not been uncollapsed yet
					$video.addClass('is-collapsed');
				}
			}, 0);
		}

		function uncollapseVideo() {
			videoCollapsed = false;
			$videoContainer.css({
				'position': '',
				'bottom': '',
				'right': '',
				'top': '',
				'left': '',
				'width': ''
			});
			$videoThumbnail.css('height', '');
			$ooyalaVideo.css('height', '');
			$video.removeClass('is-collapsed is-collapsed-ready');
			if (ooyalaVideoController) {
				updatePlayerControls(false);
			}

		}

		function closeButtonClicked(event) {
			event.stopPropagation();
			if (ooyalaVideoController && ooyalaVideoController.player) {
				ooyalaVideoController.player.pause();
			}
			uncollapseVideo();
			collapsingDisabled = true;
			track({
				action: tracker.ACTIONS.CLOSE,
				label: 'featured-video-collapsed'
			});
		}

		function updateOoyalaSize() {
			// we have to trigger resize event to make html5-skin resize controls
			window.dispatchEvent(new Event('resize'));
			// wait for player resize - there is 150ms debounce on resize event in ooyala html5-skin
			setTimeout(function () {
				ooyalaVideoController.showControls();
			}, 200);
		}

		function updatePlayerControls(waitForTransition) {
			ooyalaVideoController.hideControls();
			if (!waitForTransition) {
				updateOoyalaSize();
			}
			// otherwise wait for SIZE_CHANGED event and then execute updateOoyalaSize function only if video width
			// is equal to $collapsedVideoSize.width - so updateOoyalaSize won't be executed twice
		}

		function isVideoInFullScreenMode() {
			if (ooyalaVideoController && ooyalaVideoController.player) {
				// isFullscreen() returns false just faster switching to fullscreen mode so we also
				// check webkitIsFullScreen property - that's only for Safari
				return ooyalaVideoController.player.isFullscreen() || document.webkitIsFullScreen;
			}
			return false;
		}

		function toggleCollapse() {
			// That's for Safari because it triggers scroll event (it scrolls to the top)
			// when video is switched to full screen mode.
			if (isVideoInFullScreenMode()) {
				return;
			}
			if (!collapsingDisabled || videoCollapsed) {
				var scrollTop = $(window).scrollTop(),
					videoHeight = $video.outerHeight(),
					videoOffset = $video.offset(),
					scrollOffset = 100,
					collapseOffset = videoOffset.top + videoHeight - scrollOffset;

				if (scrollTop > collapseOffset && !videoCollapsed) {
					collapseVideo(videoOffset, videoHeight);
				} else if (scrollTop <= collapseOffset && videoCollapsed) {
					uncollapseVideo();
				}
			}
		}

		function initAttributionTracking() {
			$('.featured-video__attribution-container a').click(function () {
				track({
					action: tracker.ACTIONS.CLICK,
					label: 'attribution'
				});
			});
		}

		window.guaSetCustomDimension(34, videoId);
		window.guaSetCustomDimension(35, videoTitle);
		window.guaSetCustomDimension(36, videoLabels);
		window.guaSetCustomDimension(37, willAutoplay ? 'Yes' : 'No');

		initVideo(function (player) {
			$video.addClass('ready-to-play');

			if (playerTracker) {
				playerTracker.register(player, playerTrackerParams);
			}

			player.mb.subscribe(window.OO.EVENTS.INITIAL_PLAY, 'featured-video', function () {
				initialPlayTriggered = true;

				track({
					action: tracker.ACTIONS.PLAY_VIDEO,
					label: 'featured-video'
				});
			});

			player.mb.subscribe(window.OO.EVENTS.PLAYBACK_READY, 'ui-update', function () {
				var title = player.getTitle();
				if (recommendedVideoDepth > 0) {
					$onScrollVideoTitle.text(title);
					$onScrollVideoTime.text(
						ooyalaVideoController.getFormattedDuration(player.getDuration())
					);
					$onScrollAttribution.remove();

					window.guaSetCustomDimension(34, player.getItem().embed_code);
					window.guaSetCustomDimension(35, title);
				}
			});

			player.mb.subscribe(window.OO.EVENTS.VOLUME_CHANGED, 'featured-video', function (eventName, volume) {
				if (volume > 0) {
					track({
						action: tracker.ACTIONS.CLICK,
						label: 'featured-video-unmuted'
					});
					player.mb.unsubscribe(window.OO.EVENTS.VOLUME_CHANGED, 'featured-video');
				}
			});

			player.mb.subscribe(window.OO.EVENTS.PLAY, 'featured-video', function () {
				collapsingDisabled = false;
				if (videoFeedbackBox) {
					videoFeedbackBox.show();
				}
				track({
					action: tracker.ACTIONS.CLICK,
					label: 'featured-video-play'
				});
			});

			player.mb.subscribe(window.OO.EVENTS.PLAYED, 'featured-video', function () {
				track({
					action: tracker.ACTIONS.CLICK,
					label: 'featured-video-played'
				});
			});

			player.mb.subscribe(window.OO.EVENTS.PAUSED, 'featured-video', function () {
				if (videoFeedbackBox) {
					videoFeedbackBox.hide();
				}
				track({
					action: tracker.ACTIONS.CLICK,
					label: 'featured-video-paused'
				});
			});

			player.mb.subscribe(window.OO.EVENTS.SIZE_CHANGED, 'featured-video', function (eventName, width) {
				if (width === collapsedVideoSize.width) {
					updateOoyalaSize();
				}
			});

			player.mb.subscribe(window.OO.EVENTS.REPLAY, 'featured-video', function () {
				track({
					action: tracker.ACTIONS.CLICK,
					label: 'featured-video-replay'
				});
			});

			player.mb.subscribe(window.OO.EVENTS.PLAYHEAD_TIME_CHANGED, 'featured-video', function (eventName, time, totalTime) {
				var secondsPlayed = Math.floor(time),
					percentage = Math.round(time / totalTime * 100);

				if (secondsPlayed % 5 === 0 && secondsPlayed !== playTime) {
					playTime = secondsPlayed;
					track({
						action: tracker.ACTIONS.VIEW,
						label: 'featured-video-played-seconds-' + playTime
					});
				}

				if (percentage % 10 === 0 && percentage !== percentagePlayTime) {
					percentagePlayTime = percentage;
					track({
						action: tracker.ACTIONS.VIEW,
						label: 'featured-video-played-percentage-' + percentagePlayTime
					});
				}

				if (secondsPlayed >= 5 && !videoFeedbackBox && player.getState() === window.OO.STATE.PLAYING) {
					videoFeedbackBox = new VideoFeedbackBox();
					videoFeedbackBox.init();
				}
			});

			player.mb.subscribe(window.OO.EVENTS.WIKIA.AUTOPLAY_TOGGLED, 'featured-video', function (eventName, enabled) {
				track({
					action: tracker.ACTIONS.CLICK,
					label: enabled ? 'featured-video-autoplay-enabled' : 'featured-video-autoplay-disabled'
				});
			});

			player.mb.subscribe(window.OO.EVENTS.REPORT_DISCOVERY_IMPRESSION, 'featured-video', function () {
				track({
					action: tracker.ACTIONS.IMPRESSION,
					label: 'recommended-video'
				});
			});

			player.mb.subscribe(window.OO.EVENTS.REPORT_DISCOVERY_CLICK, 'featured-video', function (eventName, eventData) {
				// bucket_info has '2' before the JSON string
				var bucketInfo = JSON.parse(eventData.clickedVideo.bucket_info.substring(1)),
					position = bucketInfo.position,
					nextVideoData = eventData.clickedVideo || {};

				recommendedVideoDepth++;

				track({
					action: tracker.ACTIONS.VIEW,
					label: 'recommended-video-' + position
				});
				track({
					action: tracker.ACTIONS.VIEW,
					label: 'recommended-video-depth-' + recommendedVideoDepth
				});

				ooyalaVideoController.updateAdSet(ooyalaAdSetProvider.get(recommendedVideoDepth + 1, correlator, {
					contentSourceId: videoData.dfpContentSourceId,
					videoId: nextVideoData.embed_code
				}));
			});

			track({
				action: tracker.ACTIONS.IMPRESSION,
				label: 'featured-video'
			});
		});

		$closeBtn.click(closeButtonClicked);

		onScroll.bind(toggleCollapse);

		initAttributionTracking();
	});

});
