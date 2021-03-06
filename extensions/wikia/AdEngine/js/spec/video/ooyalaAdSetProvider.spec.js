/*global describe, it, expect, modules*/
describe('ext.wikia.adEngine.video.ooyalaAdSetProvider', function () {
	'use strict';

	var FAKE_VAST_URL = 'http://fake.vast.url/test',
		mocks = {
			defaultContext: {
				opts: {
					showAds: true,
					adsFrequency: 3
				}
			},
			adContext: {
				getContext: function () {
					return mocks.defaultContext;
				}
			},
			vastUrlBuilder: {
				build: function () {
					return FAKE_VAST_URL;
				}
			}
	};

	function getModule() {
		return modules['ext.wikia.adEngine.video.ooyalaAdSetProvider'](
			mocks.adContext,
			mocks.vastUrlBuilder
		);
	}

	it('Should return simplest adset if there is no parameter provided', function () {
		var adSet = getModule().get();

		expect(adSet.length).toEqual(1);
	});

	it('Should return adset with vast_url param', function () {
		var ad = getModule().get()[0];

		expect(ad.tag_url).toBeDefined();
		expect(ad.tag_url).toEqual(FAKE_VAST_URL);
	});

	it('Should return by default only preroll ad', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		getModule().get();

		expect(mocks.vastUrlBuilder.build.calls.first().args[2].vpos).toEqual('preroll');
	});

	it('Should return mid-roll if it is enabled in adContext', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		spyOn(mocks.adContext, 'getContext').and.returnValue({opts: {showAds: true, isFVMidrollEnabled: true}});
		var adSet = getModule().get();

		expect(adSet.length).toEqual(2);
		expect(mocks.vastUrlBuilder.build.calls.first().args[2].vpos).toEqual('preroll');
		expect(mocks.vastUrlBuilder.build.calls.argsFor(1)[2].vpos).toEqual('midroll');
	});

	it('Should return mid-roll with position 50% of movie', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		spyOn(mocks.adContext, 'getContext').and.returnValue({opts: {showAds: true, isFVMidrollEnabled: true}});
		var adSet = getModule().get();

		expect(adSet.length).toEqual(2);
		expect(adSet[1].position_type).toEqual('p');
		expect(adSet[1].position).toEqual(50);
	});

	it('Should return post-roll if it is enabled in adContext', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		spyOn(mocks.adContext, 'getContext').and.returnValue({opts: {showAds: true, isFVPostrollEnabled: true}});
		var adSet = getModule().get();

		expect(adSet.length).toEqual(2);
		expect(mocks.vastUrlBuilder.build.calls.first().args[2].vpos).toEqual('preroll');
		expect(mocks.vastUrlBuilder.build.calls.argsFor(1)[2].vpos).toEqual('postroll');
	});

	it('Should return pos-roll with position in the end of movie', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		spyOn(mocks.adContext, 'getContext').and.returnValue({opts: {showAds: true, isFVPostrollEnabled: true}});
		var adSet = getModule().get();

		expect(adSet.length).toEqual(2);
		expect(adSet[1].position_type).toEqual('p');
		// value > 100 required (Ooyala & recommended videos bug, check code in ooyalaAdSetProvider)
		expect(adSet[1].position).toEqual(101);
	});

	it('Should treat no param for function as a first video play', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		getModule().get();

		expect(mocks.vastUrlBuilder.build.calls.first().args[1].rv).toEqual(1);
	});

	it('Should show only first preroll if nothing else is enabled', function () {
		spyOn(mocks.adContext, 'getContext').and.returnValue({
			opts: {
				isFVMidrollEnabled: false,
				isFVPostrollEnabled: false,
				replayAdsForFV: false,
				fvAdsFrequency: 1,
				showAds: true
			}
		});

		expect(getModule().get(1).length).toEqual(1);
		expect(getModule().get(2).length).toEqual(0);
		expect(getModule().get(3).length).toEqual(0);
		expect(getModule().get(4).length).toEqual(0);
		expect(getModule().get(5).length).toEqual(0);
	});

	it('Should show preroll in correct frequency', function () {
		spyOn(mocks.adContext, 'getContext').and.returnValue({
			opts: {
				isFVMidrollEnabled: false,
				isFVPostrollEnabled: false,
				replayAdsForFV: true,
				fvAdsFrequency: 2,
				showAds: true
			}
		});

		expect(getModule().get(1).length).toEqual(1);
		expect(getModule().get(2).length).toEqual(0);
		expect(getModule().get(3).length).toEqual(1);
		expect(getModule().get(4).length).toEqual(0);
		expect(getModule().get(5).length).toEqual(1);
	});

	it('Should enable all ads if frequency capping is set and ads are enabled', function () {
		spyOn(mocks.adContext, 'getContext').and.returnValue({
			opts: {
				isFVMidrollEnabled: true,
				isFVPostrollEnabled: true,
				replayAdsForFV: true,
				fvAdsFrequency: 3,
				showAds: true
			}
		});

		expect(getModule().get(1).length).toEqual(3);
		expect(getModule().get(2).length).toEqual(0);
		expect(getModule().get(3).length).toEqual(0);
		expect(getModule().get(4).length).toEqual(3);
		expect(getModule().get(5).length).toEqual(0);
		expect(getModule().get(6).length).toEqual(0);
		expect(getModule().get(7).length).toEqual(3);
	});

	it('Should enable preroll and postrolls if both are enabled', function () {
		spyOn(mocks.adContext, 'getContext').and.returnValue({
			opts: {
				isFVMidrollEnabled: false,
				isFVPostrollEnabled: true,
				replayAdsForFV: true,
				fvAdsFrequency: 1,
				showAds: true
			}
		});

		expect(getModule().get(1).length).toEqual(2);
		expect(getModule().get(2).length).toEqual(2);
		expect(getModule().get(3).length).toEqual(2);
		expect(getModule().get(4).length).toEqual(2);
		expect(getModule().get(5).length).toEqual(2);
		expect(getModule().get(6).length).toEqual(2);
		expect(getModule().get(7).length).toEqual(2);
	});

	it('Should correctly count rv parameter for preroll', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		spyOn(mocks.adContext, 'getContext').and.returnValue({
			opts: {
				fvAdsFrequency: 3,
				replayAdsForFV: true,
				showAds: true
			}
		});

		getModule().get(1);
		getModule().get(2);
		getModule().get(3);
		getModule().get(4);
		getModule().get(5);
		getModule().get(6);
		getModule().get(7);

		expect(mocks.vastUrlBuilder.build.calls.argsFor(0)[1].rv).toEqual(1);
		expect(mocks.vastUrlBuilder.build.calls.argsFor(1)[1].rv).toEqual(2);
		expect(mocks.vastUrlBuilder.build.calls.argsFor(2)[1].rv).toEqual(3);
	});

	it('Should detect not correct input variable', function () {
		expect(getModule().get(-10).length).toEqual(0);
		expect(getModule().get('asdasd').length).toEqual(0);
		expect(getModule().get({}).length).toEqual(0);
		expect(getModule().get().length).toEqual(1);
	});

	it('Should pass correlator variable', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		spyOn(mocks.adContext, 'getContext').and.returnValue({
			opts: {
				replayAdsForFV: true,
				showAds: true
			}
		});

		getModule().get(1, 666);
		expect(mocks.vastUrlBuilder.build.calls.argsFor(0)[2].correlator).toEqual(666);
	});

	it('Should pass video id and content source id variables', function () {
		spyOn(mocks.vastUrlBuilder, 'build');
		spyOn(mocks.adContext, 'getContext').and.returnValue({
			opts: {
				replayAdsForFV: true,
				showAds: true
			}
		});

		getModule().get(1, 666, {
			contentSourceId: 111,
			videoId: 222
		});

		expect(mocks.vastUrlBuilder.build.calls.argsFor(0)[2].contentSourceId).toEqual(111);
		expect(mocks.vastUrlBuilder.build.calls.argsFor(0)[2].videoId).toEqual(222);
	});
});
