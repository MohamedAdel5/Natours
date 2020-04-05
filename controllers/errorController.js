const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFields = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value ${value} please use another value`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message); //Object.values(obj) returns an array of the object values check https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Object/values
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const handleJWTError = () => {
  return new AppError(`Invalid token please login again`, 401);
};
const handleJWTExpiredError = () => {
  return new AppError(`Your token has expired. Please login again`, 401);
};
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  //Operational errors ==> are errors that we trust and handled ==> send a message to the client
  //other errors such as programming errors shouldn't be sent
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    //1) Log error to the console
    console.error('Error!: ', err);

    //2) Send a generic message
    res.status(500).json({
      status: 'error',
      message: 'something went very wrong!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; //500 => internal server error
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    //Note that this deep copy (using spread operator) does not get the properties of the parent class. i.e: AppError inherits from Error so it has its properties(e.g: message) but if you make a copy using the spread operator syntax you will not get the Error properties
    //To fix this we can use a whole module to make a deep copy but we just need the message property so we will add it manually
    error.message = err.message;
    //Note that if the error was not of type AppError and it was only of type Error so the message property would be cloned without any problem
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    else if (error.code === 11000) error = handleDuplicateFields(error);
    //We used the code here instead of the name because this error does not have an error name
    else if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    else if (error.name === 'JsonWebTokenError') error = handleJWTError();
    else if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    //in these error handlers we don't use the error object so we can ommit it
    sendErrorProd(error, res);
  }
};
