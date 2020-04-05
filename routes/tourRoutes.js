const express = require('express');

const router = express.Router();
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');

//This was messy
// const reviewController = require('./../controllers/reviewController');
// router.route('/:id/reviews').post(authController.protect, authController.restrictTo('user'), reviewController.createReview);

const reviewRouter = require('./reviewRoutes');

router.use('/:id/reviews', reviewRouter);

// router.param('id', tourController.checkTourID);
//Tours

//special routes
//NOTE!: this route has to be put on top of the /:id route in order not to interfere together
//aliasTopTours is a middleware function that makes a query string before calling the getAlltours function
router.route('/top-5-cheapest').get(tourController.aliasTopTours, tourController.getAllTours);
router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(authController.protect, authController.restrictTo('admin', 'lead-guide', 'guide'), tourController.getMonthlyPlan);

router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(tourController.getToursWithin);
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);
router
  .route('/')
  .get(tourController.getAllTours)
  .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTour);
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.updateTour)
  .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour);

//Export router
module.exports = router;
