<?php

use Wikia\ContentReview\Models\CurrentRevisionModel;
use Wikia\ContentReview\Models\ReviewModel;

class ContentReviewApiController extends WikiaApiController {

	const CONTENT_REVIEW_RESPONSE_ACTION_INSERT = 'insert';
	const CONTENT_REVIEW_RESPONSE_ACTION_UPDATE = 'update';
	const CONTENT_REVIEW_TEST_MODE_KEY = 'contentReviewTestMode';

	/**
	 * Check permissions and add page to review queue
	 *
	 * @throws BadRequestApiException
	 * @throws NotFoundApiException
	 * @throws PermissionsException
	 * @throws \FluentSql\Exception\SqlException
	 */
	public function submitPageForReview() {
		if ( !$this->request->wasPosted()
			|| !$this->wg->User->matchEditToken( $this->request->getVal( 'editToken' ) )
		) {
			throw new BadRequestApiException();
		}

		$wikiId = $this->request->getInt( 'wikiId' );
		$pageId = $this->request->getInt( 'pageId' );

		$title = Title::newFromID( $pageId );
		if ( $title === null || !$title->isJsPage() ) {
			throw new NotFoundApiException( "JS page with ID {$pageId} does not exist");
		}

		$submitUserId = $this->wg->User->getId();
		if ( !$submitUserId > 0 || !$this->canUserSubmit( $pageId ) ) {
			throw new PermissionsException( 'edit' );
		}

		$revisionId = $title->getLatestRevID();
		$revisionData = $this->getLatestReviewedRevisionFromDB( $wikiId, $pageId );

		if ( $revisionId == $revisionData['revision_id'] ) {
			throw new BadRequestApiException( 'Current revision is already reviewed');
		}

		( new ReviewModel() )->submitPageForReview( $wikiId, $pageId,
			$revisionId, $submitUserId );

		$this->makeSuccessResponse();
	}

	/**
	 * Enable test mode
	 *
	 * @throws BadRequestApiException
	 * @throws NotFoundApiException
	 * @throws PermissionsException
	 */
	public function enableTestMode() {
		if ( !$this->request->wasPosted()
			|| !$this->wg->User->matchEditToken( $this->request->getVal( 'editToken' ) )
		) {
			throw new BadRequestApiException();
		}

		$pageId = $this->request->getInt( 'pageId' );

		$title = Title::newFromID( $pageId );
		if ( $title === null || !$title->isJsPage() ) {
			throw new NotFoundApiException( "JS page with ID {$pageId} does not exist");
		}

		$submitUserId = $this->wg->User->getId();
		if ( !$submitUserId > 0 || !$this->canUserSubmit( $pageId )	) {
			throw new PermissionsException( 'edit' );
		}

		Wikia\ContentReview\Helper::setContentReviewTestMode();
		$this->makeSuccessResponse();
	}

	/**
	 * Disable test mode
	 *
	 * @throws BadRequestApiException
	 */
	public function disableTestMode() {
		if ( !$this->request->wasPosted() ) {
			throw new BadRequestApiException();
		}

		Wikia\ContentReview\Helper::disableContentReviewTestMode();
		$this->makeSuccessResponse();
	}

	public function getCurrentPageData() {
		$wikiId = $this->request->getInt( 'wikiId' );
		$pageId = $this->request->getInt( 'pageId' );

		$revisionData = $this->getLatestReviewedRevisionFromDB( $wikiId, $pageId );

		$reviewModel = new ReviewModel();
		$reviewData = $reviewModel->getPageStatus( $wikiId, $pageId );

		$data = [
			'reviewedRevisionId' => $revisionData['revision_id'],
			'touched' => $revisionData['touched'],
			'revisionInReviewId' => $reviewData['revision_id'],
			'reviewStatus' => $reviewData['status'],
		];
		$this->makeSuccessResponse( $data );
	}

	public function getLatestReviewedRevision() {
		$wikiId = $this->request->getInt( 'wikiId' );
		$pageId = $this->request->getInt( 'pageId' );

		$revisionData = $this->getLatestReviewedRevisionFromDB( $wikiId, $pageId );

		$this->makeSuccessResponse( $revisionData );
	}

	public function showTestModeNotificaion() {
		$notification = wfMessage( 'content-review-test-mode-enabled' )->escaped();
		$notification.= Xml::element(
			'a',
			[ 'id' => 'content-review-test-mode-disable', 'href' => '#' ],
			wfMessage( 'content-review-test-mode-disable' )->plain()
		);

		$this->notification = $notification;
	}

	public function approveRevision() {

	}

	private function getLatestReviewedRevisionFromDB( $wikiId, $pageId ) {
		return ( new CurrentRevisionModel() )->getLatestReviewedRevision( $wikiId, $pageId );
	}

	private function canUserSubmit( $pageId ) {
		$title = Title::newFromID( $pageId );
		return $title->userCan( 'edit' );
	}

	private function makeSuccessResponse( Array $data = [] ) {
		$this->setVal( 'status', true );

		foreach ( $data as $key => $value ) {
			$this->setVal( $key, $value );
		}
	}
}
