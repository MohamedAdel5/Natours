//const fs = require('fs');
const Tour = require('./../models/tourModel');
// const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const handlerFactory = require('./handlerFactory');
//GETTING DATA:-
//------------------------------------------

//First using a file (beginner level)
//-----------------------------------
// const tours = JSON.parse(
//   fs.readFileSync('./dev-data/data/tours-simple.json', 'utf-8') //readFileSync function takes the path parameter relative to the directory from which node starts i.e: app.js
// );

//Now Using a DB:
//---------------

//Route Handlers

//ITS NOW IN A SEPARATE FILE
//This is a better version without using the try catch blocks
//Here a function which takes a pointer to a function as a paramter and returns a function that will be called whenever the route is matched
//this returned function takes the same three parameters of any middleware function and returns calls the asynchronous function that it took
//it also catches the error using .catch because the called function is async so it returns a promise so we can use .catch with it
// const catchAsync = fn => {
//   return (req, res, next) => {
//     fn(req, res, next).catch(err => next(err)); //for any operational error pass it to the error middleware
//   };
// };

//check https://blog.tableflip.io/the-difference-between-module-exports-and-exports/ for the difference between exports and module.exports

exports.getAllTours = handlerFactory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   const apiFeatures = new APIFeatures(Tour.find(), req.query);

//   //EXECUTE QUERY
//   const tours = await apiFeatures
//     .filter()
//     .sort()
//     .limit()
//     .fields().query;

//   //Send response
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours
//     }
//   });
//   // next();You shouldn't call next here because the response has already been sent and this will (for some reason) throw an error.
//   //You shouldn't call next() in the middleware in which you modify the response body (headers or body).
// });

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

  next();
};

exports.getTour = handlerFactory.getOne(Tour, { path: 'reviews' });

///tours-within/:distance/center/:latlng/unit/:unit
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    return next(new AppError('Please specify the latitude and longitude'));
  }
  if (!distance) {
    return next(new AppError('Please specify a distance'));
  }
  if (!unit) {
    return next(new AppError('Please specify a distance unit'));
  }

  let radius;
  if (unit === 'mi') radius = distance / 3963.2;
  else if (unit === 'km') radius = distance / 6378.1;
  else return next(new AppError('Please specify a valid distance unit (mi or km'));

  const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    return next(new AppError('Please specify the latitude and longitude'));
  }
  if (!unit) {
    return next(new AppError('Please specify a distance unit'));
  }
  let multiplier;
  if (unit === 'mi') multiplier = 0.000621371;
  else if (unit === 'km') multiplier = 0.001;
  else return next(new AppError('Please specify a valid distance unit (mi or km'));

  const ditances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        name: 1,
        distance: 1
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: ditances
    }
  });
});
// exports.getTour = catchAsync(async (req, res, next) => {
//   //findById returns one element so its equivalent to Tour.findOne(); in this case
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   if (!tour) {
//     return next(new AppError(`No tour found with that ID`, 404)); //you have to state the return in order to stop th function running
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });

exports.createTour = handlerFactory.createOne(Tour);
// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body); //req.body has to be validated first!!
//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   });
// });
exports.updateTour = handlerFactory.updateOne(Tour);
// exports.updateTour = catchAsync(async (req, res, next) => {
//   const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true //Very important: it enables the validators specified in the schema to be run on updating a document
//   });
// if (!updatedTour) {
//   return next(new AppError('No document found with that ID'));
// }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour: updatedTour
//     }
//   });
// });
exports.deleteTour = handlerFactory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError(`No tour found with that ID`, 404)); //you have to state the return in order to stop th function running
//   }

//   res.status(204).json({
//     status: 'success',
//     data: {
//       tour: null
//     }
//   });
// });

// exports.checkBody = (req, res, next) => {};
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates' //if the document has an array called startDates of length n. then it will be unwinded to n documents each has a value from the array
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12 //limits the number of outputs (gets the first six documents)
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// exports.getAllTours = async (req, res) => {
//   //JSEND data classification
//   // res.status(200).json({
//   //   status: 'success',
//   //   requestedAt: req.requestTime,
//   //   results: tours.length,
//   //   data: {
//   //     tours //equivalent to  ==> tours: tours
//   //   }
//   // });
//   //--------------------------------------------------------------------------------------------
//   try {
//     const apiFeatures = new APIFeatures(Tour.find(), req.query);
//     // //1)FILTERING DATA BASED ON QUERY STRING PARAMETERS
//     // //first: BUILD THE QUERY:
//     // const queryObj = { ...req.query }; //To make a hard copy(without this workaround, the assignment would have been a shallow copy). ==> this is ES6 syntax. first the ... destructures(like the spread operator in the array) the object into its properties then using the curly braces to specify a new object
//     // const excludedFields = ['page', 'sort', 'limit', 'fields'];
//     // excludedFields.forEach(el => delete queryObj[el]);

//     // //Advanced filtering
//     // const queryStr = JSON.stringify(queryObj).replace(
//     //   /\b(gte|gt|lte|lt)\b/g,
//     //   match => `$${match}`
//     // );
//     // //2) RETREIVING DATA FROM DB
//     // let query = Tour.find(JSON.parse(queryStr));

//     // //3) SORTING DATA
//     // if (req.query.sort) {
//     //   const sortStr = req.query.sort.split(',').join(' '); //same as req.query.sort.replace(',', ' ')
//     //   query = query.sort(sortStr);
//     // } else {
//     //   query = query.sort('-createdAt');
//     // }

//     // //4) FIELD LIMITING
//     // if (req.query.fields) {
//     //   const fields = req.query.fields.split(',').join(' ');
//     //   query = query.select(fields);
//     // } else {
//     //   query = query.select('-__v'); //select all elements except the __v element(that is added by mongoDB for some reason). The - uses to exclude the field
//     // }

//     // //5) PAGINATION
//     // const page = req.query.page * 1 || 1; //if this value is negative the -ve sign will be neglected
//     // const limit = req.query.limit * 1 || 100; //if this value is negative the -ve sign will be neglected
//     // const skip = (page - 1) * limit;
//     // query = query.skip(skip).limit(limit);
//     // if (req.query.page) {
//     //   const toursNum = await Tour.countDocuments();
//     //   if (skip >= toursNum) throw Error('This page cannot be found');
//     // }

//     //EXECUTE QUERY
//     const tours = await apiFeatures
//       .filter()
//       .sort()
//       .limit()
//       .fields().query;

//     //OR

//     // const tours = await Tour.find()
//     //   .where('duration')
//     //   .equals(5)
//     //   .where('difficulty')
//     //   .equals('easy');

//     //Send response
//     res.status(200).json({
//       status: 'success',
//       results: tours.length,
//       data: {
//         tours
//       }
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err
//     });
//   }
// };

// exports.aliasTopTours = (req, res, next) => {
//   //The 'next' arg has to be specified because its a middleware function... the response is not sent yet
//   req.query.limit = '5';
//   req.query.sort = '-ratingsAverage,price';
//   req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

//   next();
// };

// exports.getTour = async (req, res) => {
//   // const id = req.params.id * 1; //Convert string to a number by multiplying by 1 (nice trick!)
//   // const tourArr = tours.find(el => el.id === id);
//   //JSEND data classification
//   // res.status(200).json({
//   //   status: 'success',
//   //   data: {
//   //     tourArr
//   //   }
//   // });
//   //--------------------------------------------------------------------------------------------
//   try {
//     const tourID = req.params.id;
//     // const tour = await Tour.findOne({_id: tourID}); // the same as the following
//     const tour = await Tour.findById(req.params.id); //findById returns one element so its equivalent to Tour.findOne();

//     res.status(200).json({
//       status: 'success',
//       data: {
//         tour
//       }
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err
//     });
//   }
// };
// //-------------------------------------------------------------------------------------
// /*NOTE!! In POST requets you HAVE TO VALIDATE THE INPUT DATA BEFORE MANIPULATING IT! */
// //-------------------------------------------------------------------------------------
// exports.createTour = async (req, res) => {
//   // const newID = tours[tours.length - 1].id + 1;

//   // const newTour = Object.assign({ id: newID }, req.body); //merges two existing objects together

//   // tours.push(newTour);

//   // fs.writeFile(
//   //   `${__dirname}/dev-data/data/tours-simple.json`,
//   //   JSON.stringify(tours),
//   //   err => {
//   //     res.status(201).json({
//   //       status: 'success',
//   //       data: {
//   //         tour: newTour
//   //       }
//   //     });
//   //   }
//   // );
//   //--------------------------------------------------------------------------------------------
//   // const newTour = new Tour(req.body);
//   // newTour.save();
//   //instead of the previous two lines we will use Tour.create({}) method which does the same and returns a promise. Also we need to convert the func to async in order to use await.

//   try {
//     const newTour = await Tour.create(req.body); //req.body has to be validated first!!
//     res.status(201).json({
//       status: 'success',
//       data: {
//         tour: newTour
//       }
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err
//     });
//   }
// };
// exports.updateTour = async (req, res) => {
//   // res.status(200).json({
//   //   status: 'success',
//   //   data: {
//   //     tour: '<updated tour>'
//   //   }
//   // });
//   //--------------------------------------------------------------------------------------------

//   try {
//     const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true //Very important: it enables the validators specified in the schema to be run on updating a document
//     });
//     res.status(200).json({
//       status: 'success',
//       data: {
//         tour: updatedTour
//       }
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err
//     });
//   }
// };
// exports.deleteTour = async (req, res) => {
//   //delete tour
//   //   const i = tours.findIndex(el => {
//   //     el.id === res.params.id * 1;
//   //   });
//   //   tours.splice(i, 1);
//   // res.status(204).json({
//   //   status: 'success',
//   //   data: null
//   // });
//   //--------------------------------------------------------------------------------------------
//   try {
//     // const deletedTour = await Tour.findByIdAndDelete(req.params.id, {
//     //   rawResult: true
//     // });
//     // if (!deletedTour.value) {
//     //   return res.status(400).json({
//     //     status: 'fail',
//     //     message: 'No Id found'
//     //   });
//     // }
//     //   res.status(200).json({
//     //     status: 'success',
//     //     data: {
//     //       tour: deletedTour.value
//     //     }
//     //   });
//     // } catch (err) {
//     //   res.status(400).json({
//     //     status: 'fail',
//     //     message: err
//     //   });

//     //In a restful API it's a common practice not to return anything on a delete request
//     await Tour.findByIdAndDelete(req.params.id);
//     res.status(204).json({
//       status: 'success',
//       data: {
//         tour: null
//       }
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'fail',
//       message: 'error on deleting'
//     });
//   }
// };

// // exports.checkTourID = (req, res, next, val) => {
// // const tour = tours.find(el => el.id === val * 1);
// // if (!tour)
// //   return res.status(404).json({ status: 'fail', message: 'Invalid ID' });

// // next();
// // };

// exports.checkBody = (req, res, next) => {
//   // const bodyJson = req.body;
//   // if (!bodyJson.name || !bodyJson.price)
//   //   return res.status(400).json({ status: 'failed', message: 'invalid body' });
//   // next();
//   //--------------------------------------------------------------------------------------------
// };
// exports.getTourStats = async (req, res) => {
//   try {
//     //Note: we use the aggregte() function directly without specifying a .find() function before it
//     const stats = await Tour.aggregate([
//       {
//         //don't specify this object if you don't want a condition
//         $match: { ratingsAverage: { $gte: 4.5 } }
//       },
//       {
//         $group: {
//           //_id: null, //Here we specified that we want to group all together. But you might specify a certain property to group by
//           _id: '$difficulty',
//           // _id: { difficulty: '$difficulty', price: '$price' }, // you can group by two fields like this
//           //_id: { $toUpper: '$difficulty' }, //you can specify some properties on the id values that would be sent e.g: you can convert to uppercase
//           numTours: { $sum: 1 },
//           numRatings: { $sum: '$ratingsQuantity' },
//           avgRating: { $avg: '$ratingsAverage' },
//           avgPrice: { $avg: '$price' },
//           minPrice: { $min: '$price' },
//           maxPrice: { $max: '$price' }
//         }
//       },
//       {
//         $sort: { avgPrice: 1 }
//       }
//       // { //You can repeat stages i.e $match is repeated twice
//       //   $match: {_id: { $ne: 'easy'}}
//       // }
//     ]);

//     res.status(200).json({
//       status: 'success',
//       data: {
//         stats
//       }
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err
//     });
//   }
// };

// exports.getMonthlyPlan = async (req, res) => {
//   try {
//     const year = req.params.year * 1;
//     const plan = await Tour.aggregate([
//       {
//         $unwind: '$startDates' //if the document has an array called startDates of length n. then it will be unwinded to n documents each has a value from the array
//       },
//       {
//         $match: {
//           startDates: {
//             $gte: new Date(`${year}-01-01`),
//             $lte: new Date(`${year}-12-31`)
//           }
//         }
//       },
//       {
//         $group: {
//           _id: { $month: '$startDates' },
//           numTourStarts: { $sum: 1 },
//           tours: { $push: '$name' }
//         }
//       },
//       {
//         $addFields: { month: '$_id' }
//       },
//       {
//         $project: {
//           _id: 0
//         }
//       },
//       {
//         $sort: { numTourStarts: -1 }
//       },
//       {
//         $limit: 12 //limits the number of outputs (gets the first six documents)
//       }
//     ]);

//     res.status(200).json({
//       status: 'success',
//       data: {
//         plan
//       }
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err
//     });
//   }
// };
