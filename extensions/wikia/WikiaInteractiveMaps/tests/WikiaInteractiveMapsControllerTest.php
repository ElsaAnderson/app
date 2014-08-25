<?php
class WikiaInteractiveMapsControllerTest extends WikiaBaseTest {

	const WIKI_URL = 'http://muppet.wikia.com/wiki/Special:Maps';
	const WIKI_CITY_ID = 1;
	const WIKI_FOREIGN_CITY_ID = 2;

	public function setUp() {
		global $IP;
		$this->setupFile = "$IP/extensions/wikia/WikiaInteractiveMaps/WikiaInteractiveMaps.setup.php";
		parent::setUp();
	}

	public function testRedirectIfForeignWiki_not_foreign() {
		$wikiaInteractiveMapsControllerMock = $this->getWikiaInteractiveMapsControllerMock();

		$wikiaInteractiveMapsControllerMock->wg->CityId = self::WIKI_CITY_ID;

		$outputPageMock = $this->getMock( 'OutputPage', [ 'redirect' ], [], '', false );
		$outputPageMock->expects( $this->never() )
			->method( 'redirect' );
		$wikiaInteractiveMapsControllerMock->wg->out = $outputPageMock;

		$wikiaInteractiveMapsControllerMock->redirectIfForeignWiki( self::WIKI_CITY_ID, 1 );
	}

	public function testRedirectIfForeignWiki_foreign() {
		$wikiaInteractiveMapsControllerMock = $this->getWikiaInteractiveMapsControllerMock( true );

		$wikiaInteractiveMapsControllerMock->wg->CityId = self::WIKI_CITY_ID;

		$outputPageMock = $this->getMock( 'OutputPage', [ 'redirect' ], [], '', false );
		$outputPageMock->expects( $this->once() )
			->method( 'redirect' );
		$wikiaInteractiveMapsControllerMock->wg->out = $outputPageMock;

		$wikiaInteractiveMapsControllerMock->redirectIfForeignWiki( self::WIKI_FOREIGN_CITY_ID, 1 );
	}

	/**
	 * @return PHPUnit_Framework_MockObject_MockObject|WikiaInteractiveMapsController
	 */
	private function getWikiaInteractiveMapsControllerMock() {
		$mock = $this->getMock( 'WikiaInteractiveMapsController', [ 'getWikiPageUrl' ], [], '', false );

		$mock->expects( $this->any() )
			->method( 'getWikiPageUrl' )
			->will( $this->returnValue( self::WIKI_URL ) );

		return $mock;
	}

	public function testMap_mapNotFound() {
		$exceptionObject = new stdClass();
		$exceptionObject->message = 'Map not found';
		$exceptionObject->details = 'Map with given id (1) was not found.';

		$appMock = $this->getMock( 'WikiaApp', [ 'checkSkin' ], [], '', false );
		$appMock->expects( $this->once() )
			->method( 'checkSkin' )
			->will( $this->returnValue(false) );

		$requestMock = $this->getMock( 'WikiaRequest', [ 'getInt' ], [], '', false );
		$requestMock->expects( $this->any() )
			->method( 'getInt' )
			->will( $this->returnValue(1) );

		$responseMock = $this->getMock( 'WikiaResponse', [ 'addAsset', 'setTemplateEngine' ], [], '', false );
		$responseMock->expects( $this->once() )
			->method( 'addAsset' );
		$responseMock->expects( $this->once() )
			->method( 'setTemplateEngine' );

		$mapsModelMock = $this->getMock( 'WikiaMaps', [ 'getMapByIdFromApi' ], [], '', false );
		$mapsModelMock->expects( $this->once() )
			->method( 'getMapByIdFromApi' )
			->will( $this->returnValue( $exceptionObject ) );

		$mapsControllerMock = $this->getMock( 'WikiaInteractiveMapsController', [
			'getModel',
			'redirectIfForeignWiki',
			'setVal',
			'addAsset',
			'setTemplateEngine'
		], [], '', false );

		$mapsControllerMock->expects( $this->once() )
			->method( 'getModel' )
			->will( $this->returnValue( $mapsModelMock ) );
		$mapsControllerMock->expects( $this->never() )
			->method( 'redirectIfForeignWiki' );
		$mapsControllerMock->expects( $this->any() )
			->method( 'setVal' );

		$mapsControllerMock->app = $appMock;
		$mapsControllerMock->request = $requestMock;
		$mapsControllerMock->response = $responseMock;

		$mapsControllerMock->map();
	}

}
