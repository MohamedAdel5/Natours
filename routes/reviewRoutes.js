const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');
const Review = require('./../models/reviewModel');

//The option mergeParams ->> Merges the parameters of this router with the previous router.
//i.e: the route tours/:id/reviews will be mounted to the tour router first which will have access to the id param and then
//the tour router will re-route it to the review router which does not have the id parameter.
//If we specified this option, we will have access to this parameter
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(authController.restrictTo('user'), reviewController.setTourAndUserIds, reviewController.createReview);

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(authController.restrictTo('admin', 'user'), authController.userAuthentication(Review), reviewController.deleteReview)
  .patch(authController.restrictTo('admin', 'user'), authController.userAuthentication(Review), reviewController.updateReview);

module.exports = router;
