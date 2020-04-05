const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError(`No document found with that ID`, 404)); //you have to state the return in order to stop th function running
    }

    res.status(204).json({
      status: 'success',
      data: {
        data: null
      }
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true //Very important: it enables the validators specified in the schema to be run on updating a document
    });
    if (!updatedDoc) {
      return next(new AppError('No document found with that ID'));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: updatedDoc
      }
    });
  });

module.exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body); //req.body has to be validated first!!
    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc
      }
    });
  });

module.exports.getOne = (Model, populateOpt) =>
  catchAsync(async (req, res, next) => {
    //findById returns one element so its equivalent to Tour.findOne(); in this case
    let query = Model.findById(req.params.id);
    if (populateOpt) query = query.populate(populateOpt);
    const doc = await query;
    if (!doc) {
      return next(new AppError(`No document found with that ID`, 404)); //you have to state the return in order to stop th function running
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

module.exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    //To allow for nested get reviews on tour to avoid additional middlewares
    //used in getAllReviews for a certain tour in reviewsController
    const filter = {};
    if (req.params.id) filter.tour = req.params.id;

    const apiFeatures = new APIFeatures(Model.find(filter), req.query);

    //EXECUTE QUERY
    const docs = await apiFeatures
      .filter()
      .sort()
      .limit()
      .fields().query; //add .explain() to get query data after querying

    //Send response
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        data: docs
      }
    });
    // next();You shouldn't call next here because the response has already been sent and this will (for some reason) throw an error.
    //You shouldn't call next() in the middleware in which you modify the response body (headers or body).
  });
