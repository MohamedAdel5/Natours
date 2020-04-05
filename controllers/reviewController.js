const Review = require('./../models/reviewModel');
// const catchAsync = require('./../utils/catchAsync');
const handlerFactory = require('./handlerFactory');

module.exports.getAllReviews = handlerFactory.getAll(Review);
// module.exports.getAllReviews = catchAsync(async (req, res, next) => {
//   const filter = {};
//   if (req.params.id) filter.tour = req.params.id;
//   const reviews = await Review.find(filter);
//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews
//     }
//   });
// next();You shouldn't call next here because the response has already been sent and this will (for some reason) throw an error.
//You shouldn't call next() in the middleware in which you modify the response body (headers or body).
// });
module.exports.setTourAndUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.id;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};

module.exports.createReview = handlerFactory.createOne(Review);

// module.exports.createReview = catchAsync(async (req, res, next) => {
//   if (!req.body.tour) req.body.tour = req.params.id;
//   if (!req.body.user) req.body.user = req.user._id;
//   const cretedReview = await Review.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       cretedReview
//     }
//   });
// });

module.exports.deleteReview = handlerFactory.deleteOne(Review);
module.exports.updateReview = handlerFactory.updateOne(Review);
module.exports.getReview = handlerFactory.getOne(Review);
