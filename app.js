//MODULES:-
//------------------------------------------
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const errorController = require('./controllers/errorController');

const toursRouter = require('./routes/tourRoutes');
const usersRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const trackRouter = require('./routes/trackRoutes');

const app = express();

//GLOBAL MIDDLEWARES:-
//------------------------------------------

// 1) set security http headers
//Should be put at the top of the middleware stack
app.use(helmet());

//2) Limit requests
const limiter = rateLimit({
  //limits 100 requests for each IP in one hour. If the IP exceeds this limit then it would have to wait for an hour to pass from the first request
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: {
    status: 'fail',
    message: 'Two many requests from this IP. please try again in an hour.'
  }
});
app.use('/api', limiter);

//3)Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); //Third party middleware that logs some request data like method type and status in the console
}

//4)Body parser and data sanitization
//First: Reading data from the body of the request as json and converting it to javascript object into req.body
app.use(express.json({ limit: '10kb' })); // The option limits the body data of the request to 10KB
//Second: Data sanitization against NoSQL injection attacks.
app.use(mongoSanitize());
//Third: Data sanitization against XSS(cross-site scripting) attacks.
app.use(xss());
//Fourth: Prevent parameter pollution (prevents duplicate query string parameters)
app.use(
  hpp({
    whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price']
  })
);

app.use(cookieParser());
// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next(); //NOTE!: You HAVE TO call this function
// });

//5)Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next(); //NOTE!: You HAVE TO call next function to proceed to the next middleware without stucking
});

// //FILES:-
// //------------------------------------------
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`, 'utf-8')
// );

//ROUTE HANDLERS:-
//------------------------------------------
// const getAllTours = (req, res) => {
//   //JSEND data classification
//   res.status(200).json({
//     status: 'success',
//     requestedAt: req.requestTime,
//     results: tours.length,
//     data: {
//       tours //equivalent to  ==> tours: tours
//     }
//   });
// };

// const getTour = (req, res) => {
//   const id = req.params.id * 1; //Convert string to a number by multiplying by 1 (nice trick!)

//   const tourArr = tours.find(el => el.id === id);
//   if (!tourArr)
//     return res.status(404).json({ status: 'fail', message: 'invalid ID' });
//   //JSEND data classification
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tourArr
//     }
//   });
// };
// //-------------------------------------------------------------------------------------
// /*NOTE!! In POST requets you HAVE TO VALIDATE THE INPUT DATA BEFORE MANIPULATING IT! */
// //-------------------------------------------------------------------------------------
// const createTour = (req, res) => {
//   const newID = tours[tours.length - 1].id + 1;

//   const newTour = Object.assign({ id: newID }, req.body); //merges two existing objects together

//   tours.push(newTour);

//   fs.writeFile(
//     `${__dirname}/dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     err => {
//       res.status(201).json({
//         status: 'success',
//         data: {
//           tour: newTour
//         }
//       });
//     }
//   );
// };
// const updateTour = (req, res) => {
//   const tour = tours.find(el => el.id === req.params.id * 1);
//   if (!tour)
//     return res.status(404).json({ status: 'fail', message: 'invalid ID' });
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour: '<updated tour>'
//     }
//   });
// };
// const deleteTour = (req, res) => {
//   const tour = tours.find(el => el.id === req.params.id * 1);
//   if (!tour)
//     return res.status(404).json({ status: 'fail', message: 'Tour not found' });

//   //delete tour
//   //   const i = tours.findIndex(el => {
//   //     el.id === res.params.id * 1;
//   //   });
//   //   tours.splice(i, 1);

//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// };
// const getAllUsers = (req, res) => {
//   res.status(500).json({
//     status: 'failed',
//     message: 'No users found'
//   });
// };
// const getUser = (req, res) => {
//   res.status(500).json({
//     status: 'failed',
//     message: 'No users found'
//   });
// };
// const createUser = (req, res) => {
//   res.status(500).json({
//     status: 'failed',
//     message: 'No users found'
//   });
// };
// const updateUser = (req, res) => {
//   res.status(500).json({
//     status: 'failed',
//     message: 'No users found'
//   });
// };
// const deleteUser = (req, res) => {
//   res.status(500).json({
//     status: 'failed',
//     message: 'No users found'
//   });
// };

//ROUTES:-
//------------------------------------------
//Version 1)
// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

//Version 2)
//Tours
// app
//   .route('/api/v1/tours')
//   .get(getAllTours)
//   .post(createTour);
// app
//   .route('/api/v1/tours/:id')
//   .get(getTour)
//   .patch(updateTour)
//   .delete(deleteTour);
// //Users
// app
//   .route('/api/v1/users')
//   .get(getAllUsers)
//   .post(createUser);
// app
//   .route('/api/v1/users/:id')
//   .get(getUser)
//   .patch(updateUser)
//   .delete(deleteUser);

//Version 3)
// const toursRouter = express.Router();
// const usersRouter = express.Router();
// //Tours
// toursRouter
//   .route('/')
//   .get(getAllTours)
//   .post(createTour);
// toursRouter
//   .route('/:id')
//   .get(getTour)
//   .patch(updateTour)
//   .delete(deleteTour);
// //Users
// usersRouter
//   .route('/')
//   .get(getAllUsers)
//   .post(createUser);
// usersRouter
//   .route('/:id')
//   .get(getUser)
//   .patch(updateUser)
//   .delete(deleteUser);

// app.use('/api/v1/tours', toursRouter);
// app.use('/api/v1/users', usersRouter);

//Version 4)
//Separated in external files (modules)
//Only mount routes (using a middleware to specify routes is called mounting routes)

//6)Serving static files
app.use(express.static('./public'));

//7)Routes
app.use('/api/v1/tours', toursRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/tracks', trackRouter);
/*
NOW IF NONE OF THE SPECIFIED ROUTES MATCHES THE ENTERED URL BY THE USER
WE SHOULD SEND BACK AN ERROR RESPONSE PAGE
THIS RESPONSE SHOULD NOT ONLY USED FOR .get(), BUT IT SHOULD BE USED FOR .all()
SO...
*/
app.all('*', (req, res, next) => {
  //'*' indicates that this middleware will work for all the routes

  // //1) first approach (naive)
  // res.status(404).json({
  //   status: 'fail',
  //   message: `can't find ${req.originalUrl} on this server!`
  // });

  // //2) second approach (better)
  // const err = new Error(`can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  //3) last approach (the best)
  // const err = new err(`can't find ${req.originalUrl} on this server!`, 404);  //Or it can be specified directly as the next() function parameter
  next(new AppError(`can't find ${req.originalUrl} on this server!`, 404)); //whatever passed in the next() fn will be treated as an error so it sends it to the error handling middleware and skip all other middlewares
});

//ERROR HANDLING MIDDLEWARE (instead of specifying the error in each response)
//It takes 4 parameters. When express finds that it has these params then it will treat it as an error handling fn.
//It's now in a separate controller called errorController

// app.use((err, req, res, next) => {
//   err.statusCode = err.statusCode || 500; //500 => internal server error
//   err.status = err.status || 'error';

//   res.status(err.statusCode).json({
//     status: err.status,
//     message: err.message
//   });
// });

//8)Error handler middleware
app.use(errorController);

//START THE SERVER:-
//------------------------------------------
// const port = 3000;
// app.listen(port, () => {
//   console.log(`Running on port ${port}...`);
// });

//Now in a separated file
module.exports = app;
