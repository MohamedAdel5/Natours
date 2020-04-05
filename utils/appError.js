class AppError extends Error {
  constructor(message, statusCode) {
    super(message); //calls the constructor of the Error class
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith(4) ? 'fail' : 'error';
    this.isOperational = true; //This is used to check if the error which the error handling middleware catches is comming from this class (an operational error not a programming error)

    Error.captureStackTrace(this, this.constructor); //Create .stack property on any object of this class. This property retreives the call stack of the error
  }
}

module.exports = AppError;
