/*
 
 ##     ##  #######  ########  ##     ## ##       ########  ######  
 ###   ### ##     ## ##     ## ##     ## ##       ##       ##    ## 
 #### #### ##     ## ##     ## ##     ## ##       ##       ##       
 ## ### ## ##     ## ##     ## ##     ## ##       ######    ######  
 ##     ## ##     ## ##     ## ##     ## ##       ##             ## 
 ##     ## ##     ## ##     ## ##     ## ##       ##       ##    ## 
 ##     ##  #######  ########   #######  ######## ########  ######  
 
*/

const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
//this is a built in module in express which has utility functions. we use es6 destructuring to get the promisify function only
const sendEmail = require('./../utils/email');

//Brief info about cookies and sessions:
//also check https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
//Cookie:
//It is a file that is stored in the users machine.
//It's specific for each browser(each browser can't access other browsers' cookies).
//It is sent in the header of the response (Set-Cookie: id=a3fWa; Expires=Wed, 21 Oct 2015 07:28:00 GMT, [other options]).
//It has ana expiry date and some security options that the browser is responsible for their implementation.
//like httpOnly option that prevents any script from reading the cookie or modifying it...
//and the secure option that prevents sending the request using non secure protocol.
//For each request the browser makes to the domain that's defined in the cookie, the browser will send all the cookies to this domain.

//Session:  (server side cookie)
//It's not a standard. It's like a way of establishing a stateful connection using http which is a stateless protocol.
//It cannot be used in RESTful apis because the RESTful api standard states that the api should be stateless and the no client data...
//should be stored on the server, it should be stored on the client side
//It is a collection of data that are stored in the server (server side session) or the client side (client side session).
//For each collection of data there is an associated session id by which the data is accessed $SESSION['session id'].data.
//In client side session, which is a cookie :'D.
//In a server side session, data is stored in the server and an associated id is stored on the client side.
//This id can be stored in the user in few ways:  by sending a cookie or by sending it in the url or in the body or maybe in the header of the request.
//The user has to send it with each request to confirm his identity to the server.

/*
 
 ##     ## ######## #### ##       #### ######## ##    ##    ######## ##     ## ##    ##  ######  ######## ####  #######  ##    ##  ######  
 ##     ##    ##     ##  ##        ##     ##     ##  ##     ##       ##     ## ###   ## ##    ##    ##     ##  ##     ## ###   ## ##    ## 
 ##     ##    ##     ##  ##        ##     ##      ####      ##       ##     ## ####  ## ##          ##     ##  ##     ## ####  ## ##       
 ##     ##    ##     ##  ##        ##     ##       ##       ######   ##     ## ## ## ## ##          ##     ##  ##     ## ## ## ##  ######  
 ##     ##    ##     ##  ##        ##     ##       ##       ##       ##     ## ##  #### ##          ##     ##  ##     ## ##  ####       ## 
 ##     ##    ##     ##  ##        ##     ##       ##       ##       ##     ## ##   ### ##    ##    ##     ##  ##     ## ##   ### ##    ## 
  #######     ##    #### ######## ####    ##       ##       ##        #######  ##    ##  ######     ##    ####  #######  ##    ##  ######  
 
*/
/*
 ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### #######
 ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### #######
 ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### #######
 ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### #######
*/
/*
 
  ######  ####  ######   ##    ##    ########  #######  ##    ## ######## ##    ## 
 ##    ##  ##  ##    ##  ###   ##       ##    ##     ## ##   ##  ##       ###   ## 
 ##        ##  ##        ####  ##       ##    ##     ## ##  ##   ##       ####  ## 
  ######   ##  ##   #### ## ## ##       ##    ##     ## #####    ######   ## ## ## 
       ##  ##  ##    ##  ##  ####       ##    ##     ## ##  ##   ##       ##  #### 
 ##    ##  ##  ##    ##  ##   ###       ##    ##     ## ##   ##  ##       ##   ### 
  ######  ####  ######   ##    ##       ##     #######  ##    ## ######## ##    ## 
 
*/
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    //the secret string should be at least 32 characters long
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

/*
 
  ######  ########  ########    ###    ######## ########     ######  ######## ##    ## ########     ########  #######  ##    ## ######## ##    ## 
 ##    ## ##     ## ##         ## ##      ##    ##          ##    ## ##       ###   ## ##     ##       ##    ##     ## ##   ##  ##       ###   ## 
 ##       ##     ## ##        ##   ##     ##    ##          ##       ##       ####  ## ##     ##       ##    ##     ## ##  ##   ##       ####  ## 
 ##       ########  ######   ##     ##    ##    ######       ######  ######   ## ## ## ##     ##       ##    ##     ## #####    ######   ## ## ## 
 ##       ##   ##   ##       #########    ##    ##                ## ##       ##  #### ##     ##       ##    ##     ## ##  ##   ##       ##  #### 
 ##    ## ##    ##  ##       ##     ##    ##    ##          ##    ## ##       ##   ### ##     ##       ##    ##     ## ##   ##  ##       ##   ### 
  ######  ##     ## ######## ##     ##    ##    ########     ######  ######## ##    ## ########        ##     #######  ##    ## ######## ##    ## 
 
*/
const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    //takes the date of expiry as a timestamp in milliseconds
    //Date.now() without new Date() would not work
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    //the cookie will not be accessed or modified by the browser (prevents cross-site scripting hacks)
    httpOnly: true
  };

  //In production send the cookie via https connection only
  //It means that the cookie will be sent in a secure connection (HTTPS)
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

/*
 
 ######## #### ##       ######## ######## ########     ##     ##  ######  ######## ########  
 ##        ##  ##          ##    ##       ##     ##    ##     ## ##    ## ##       ##     ## 
 ##        ##  ##          ##    ##       ##     ##    ##     ## ##       ##       ##     ## 
 ######    ##  ##          ##    ######   ########     ##     ##  ######  ######   ########  
 ##        ##  ##          ##    ##       ##   ##      ##     ##       ## ##       ##   ##   
 ##        ##  ##          ##    ##       ##    ##     ##     ## ##    ## ##       ##    ##  
 ##       #### ########    ##    ######## ##     ##     #######   ######  ######## ##     ## 
 
*/

const filterUser = (userObj, ...allowedFields) => {
  //Object.keys(obj) is a function that returns an array of the elements in the obj
  const filteredUserObj = userObj._doc;
  Object.keys(filteredUserObj).forEach(el => {
    if (!allowedFields.includes(el)) filteredUserObj[el] = undefined;
  });
  return filteredUserObj;
};

/*
 
 ########   #######  ##     ## ######## ########    ##     ##    ###    ##    ## ########  ##       ######## ########   ######  
 ##     ## ##     ## ##     ##    ##    ##          ##     ##   ## ##   ###   ## ##     ## ##       ##       ##     ## ##    ## 
 ##     ## ##     ## ##     ##    ##    ##          ##     ##  ##   ##  ####  ## ##     ## ##       ##       ##     ## ##       
 ########  ##     ## ##     ##    ##    ######      ######### ##     ## ## ## ## ##     ## ##       ######   ########   ######  
 ##   ##   ##     ## ##     ##    ##    ##          ##     ## ######### ##  #### ##     ## ##       ##       ##   ##         ## 
 ##    ##  ##     ## ##     ##    ##    ##          ##     ## ##     ## ##   ### ##     ## ##       ##       ##    ##  ##    ## 
 ##     ##  #######   #######     ##    ########    ##     ## ##     ## ##    ## ########  ######## ######## ##     ##  ######  
 
*/
/*
 ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### #######
 ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### #######
 ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### #######
 ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### ####### #######
*/
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    //It's added here but won't be added to the DB because it will be removed in the .pre('save') hook.
    //The aim is to make pass this property to the validator of the schema
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role
  });

  const filteredUser = filterUser(newUser, 'name', 'email', '_id', 'active', 'role');
  createAndSendToken(filteredUser, 201, res);
  //   const token = signToken(filteredUser._id);
  //   res.status(201).json({
  //     status: 'success',
  //     token,
  //     data: {
  //       user: filteredUser
  //     }
  //   });
});

/*
 
 ##        #######   ######   #### ##    ## 
 ##       ##     ## ##    ##   ##  ###   ## 
 ##       ##     ## ##         ##  ####  ## 
 ##       ##     ## ##   ####  ##  ## ## ## 
 ##       ##     ## ##    ##   ##  ##  #### 
 ##       ##     ## ##    ##   ##  ##   ### 
 ########  #######   ######   #### ##    ## 
 
*/

exports.login = catchAsync(async (req, res, next) => {
  //es6 syntax: it matches the name of the LHS{email, password} with the properties names in the RHS(req.body)
  const { email, password } = req.body;

  //1) check if email and password exist in the request body
  if (!email || !password) return next(new AppError('Please provide email and password!', 400));

  //2) check if user exists && password is correct (matches a user in the db)
  //in es6: this can be written as findOne({email})
  ////we used the + because we excluded the password in the model and now we want to include it in the object.
  const user = await User.findOne({ email: email }).select('+password');
  if (!user)
    return next(
      //In fact at this point only the email is incorrect but the message should not specify which field is incorrect for security issues
      new AppError('Incorrect email or password', 400)
    );
  const correct = await user.correctPassword(password, user.password);

  if (!correct) {
    //In fact at this point only the password is incorrect but the message should not specify which field is incorrect for security issues
    return next(new AppError('Incorrect email or password', 400));
  }

  //the above code could be like this:
  /*
  if (!correct || (!await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 400));
  }
  */

  //3)If everything is ok, send token to client
  const filteredUser = filterUser(user, 'name', 'email', '_id', 'active', 'role');
  createAndSendToken(filteredUser, 200, res);
  //   const token = signToken(filteredUser._id);
  //   res.status(200).json({
  //     status: 'success',
  //     filteredUser,
  //     token
  //   });
});

/*
 
 ########  ########   #######  ######## ########  ######  ######## 
 ##     ## ##     ## ##     ##    ##    ##       ##    ##    ##    
 ##     ## ##     ## ##     ##    ##    ##       ##          ##    
 ########  ########  ##     ##    ##    ######   ##          ##    
 ##        ##   ##   ##     ##    ##    ##       ##          ##    
 ##        ##    ##  ##     ##    ##    ##       ##    ##    ##    
 ##        ##     ##  #######     ##    ########  ######     ##    
 
*/

exports.protect = catchAsync(async (req, res, next) => {
  //1) check if the token exists
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
    token = req.headers.authorization.split(' ')[1];
  else return next(new AppError(`you're not logged in. Please login to get access`, 401));

  if (req.cookies.jwt) {
    //console.log(req.cookies.jwt);
  }
  //2)Verfication of the token

  //A jwt consists of header, payload, signature. this function checks if the given jwt signature is valid ((((IT RETURNS THE PAYLOAD))))
  //Breifly this function checks that the secret key used in the given token is the same as the one that generates the token in the app.
  //(This is done by extracting the header and the payload from the given token then encoding them with the given secret key and comparing...
  //the result with the signature of the token) (In conclusion, the secret key is what makes it very difficult to hack the signature)
  //Note that the signature is an encoded combination of the payload, header and the secret key.
  //But if it's not valid it returns an error (JsonWebTokenError) which is catched in the catchAsnyc function and then passed to the...
  //error handling middleware to the errorController
  //If the token is expired then this function also throws an error (TokenExpiredError) which is catched also with the same manner.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)Check if user exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return next(new AppError(`The user that belongs to this token no longer exists`, 401));

  //4)Check if user changed password after the JWT is issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    //passes the issued-at time stamp(time at which this token is released)
    return next(new AppError(`User recently changed his password. Please login again`, 401));
  }

  //Now if none of the previous exceptions take place then the user can go to the requested URL
  //Grant access to the protected route

  const filteredUser = filterUser(currentUser, 'name', 'email', '_id', 'active', 'role');
  req.user = filteredUser; //Pass the user to the next middleware
  next();
});

/*
 
 ########  ########  ######  ######## ########  ####  ######  ########    ########  #######  
 ##     ## ##       ##    ##    ##    ##     ##  ##  ##    ##    ##          ##    ##     ## 
 ##     ## ##       ##          ##    ##     ##  ##  ##          ##          ##    ##     ## 
 ########  ######    ######     ##    ########   ##  ##          ##          ##    ##     ## 
 ##   ##   ##             ##    ##    ##   ##    ##  ##          ##          ##    ##     ## 
 ##    ##  ##       ##    ##    ##    ##    ##   ##  ##    ##    ##          ##    ##     ## 
 ##     ## ########  ######     ##    ##     ## ####  ######     ##          ##     #######  
 
*/

exports.restrictTo = (...roles) => {
  //Now roles = [arg1, arg2, ...]
  return (req, res, next) => {
    //The user is in the req object because the protect middleware included it
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`You do not have permession to perform this action`, 403)); //The user is not authorized
    }
    return next(); //The user is authorized
  };
};

/*
 
 ##     ##  ######  ######## ########     ###    ##     ## ######## ##     ## ######## ##    ## ######## ####  ######     ###    ######## ####  #######  ##    ## 
 ##     ## ##    ## ##       ##     ##   ## ##   ##     ##    ##    ##     ## ##       ###   ##    ##     ##  ##    ##   ## ##      ##     ##  ##     ## ###   ## 
 ##     ## ##       ##       ##     ##  ##   ##  ##     ##    ##    ##     ## ##       ####  ##    ##     ##  ##        ##   ##     ##     ##  ##     ## ####  ## 
 ##     ##  ######  ######   ########  ##     ## ##     ##    ##    ######### ######   ## ## ##    ##     ##  ##       ##     ##    ##     ##  ##     ## ## ## ## 
 ##     ##       ## ##       ##   ##   ######### ##     ##    ##    ##     ## ##       ##  ####    ##     ##  ##       #########    ##     ##  ##     ## ##  #### 
 ##     ## ##    ## ##       ##    ##  ##     ## ##     ##    ##    ##     ## ##       ##   ###    ##     ##  ##    ## ##     ##    ##     ##  ##     ## ##   ### 
  #######   ######  ######## ##     ## ##     ##  #######     ##    ##     ## ######## ##    ##    ##    ####  ######  ##     ##    ##    ####  #######  ##    ## 
 
*/

//Has to be called after protect and restrictTo
exports.userAuthentication = Model => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) return next(new AppError('No document found with that ID', 401));

    if (!req.user._id.equals(doc.user._id) && !req.user._id.equals(doc.user)) {
      return next(new AppError('You are not authorized to do this action', 401));
    }
    return next(); //the user is authorized
  });
};

/*
 
 ########  #######  ########   ######    #######  ######## ########     ###     ######   ######  ##      ##  #######  ########  ########  
 ##       ##     ## ##     ## ##    ##  ##     ##    ##    ##     ##   ## ##   ##    ## ##    ## ##  ##  ## ##     ## ##     ## ##     ## 
 ##       ##     ## ##     ## ##        ##     ##    ##    ##     ##  ##   ##  ##       ##       ##  ##  ## ##     ## ##     ## ##     ## 
 ######   ##     ## ########  ##   #### ##     ##    ##    ########  ##     ##  ######   ######  ##  ##  ## ##     ## ########  ##     ## 
 ##       ##     ## ##   ##   ##    ##  ##     ##    ##    ##        #########       ##       ## ##  ##  ## ##     ## ##   ##   ##     ## 
 ##       ##     ## ##    ##  ##    ##  ##     ##    ##    ##        ##     ## ##    ## ##    ## ##  ##  ## ##     ## ##    ##  ##     ## 
 ##        #######  ##     ##  ######    #######     ##    ##        ##     ##  ######   ######   ###  ###   #######  ##     ## ########  
 
*/

//Receives the email of the user that forgot his pass
//and sends a token to this email
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on the given email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(`There is no user with this email`, 404));
  }
  //2)Generate a random reset token
  //This function sets the properties 'passwordResetToken' & 'passwordResetExpires' of the user object and returns the un-hashed token
  const resetToken = user.createPasswordResetToken();

  //Now save the changes in the user object (the added properties) to the database
  //and the specified option is to disable the validation of the schema(remember that the schema validation is aa .pre('save) Hook)
  //we disabled it because the confirmPassword property is not stated in the retreived user object so if we saved this would produce a validation error
  await user.save({ validateBeforeSave: false });

  //3)Send it to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with yout new password and passwordConfirm to: ${resetURL}.\n
  If you didn't forget your password, please ignore this email.`;
  try {
    //We used try catch in this block of code because we wanted to do some stuff before we send the error message to the error handling middleware
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (Valid for 10 mins)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    //delete the two fields 'passwordResetToken' & 'passwordResetExpires' from DB
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError(`There was an error sending the email. Try again later.`, 500));
  }
});

/*
 
 ########  ########  ######  ######## ########    ########     ###     ######   ######  ##      ##  #######  ########  ########  
 ##     ## ##       ##    ## ##          ##       ##     ##   ## ##   ##    ## ##    ## ##  ##  ## ##     ## ##     ## ##     ## 
 ##     ## ##       ##       ##          ##       ##     ##  ##   ##  ##       ##       ##  ##  ## ##     ## ##     ## ##     ## 
 ########  ######    ######  ######      ##       ########  ##     ##  ######   ######  ##  ##  ## ##     ## ########  ##     ## 
 ##   ##   ##             ## ##          ##       ##        #########       ##       ## ##  ##  ## ##     ## ##   ##   ##     ## 
 ##    ##  ##       ##    ## ##          ##       ##        ##     ## ##    ## ##    ## ##  ##  ## ##     ## ##    ##  ##     ## 
 ##     ## ########  ######  ########    ##       ##        ##     ##  ######   ######   ###  ###   #######  ##     ## ########  
 
*/

//receives a token and a new password
//updates the users password
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash('SHA256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  //2) If token has not expired and the user exists => set new password
  if (!user) return next(new AppError(`Token is invalid or has expired`, 400));

  //3) Update changePasswordAt and Unset the properties passwordResetToken & passwordResetExpires

  //NOTE!: we used .save() not update function of mongoose because we wanted the .pre('save') Hooks to be called for validation
  //And that's necessary for password confirmation
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //   user.passwordChangedAt = Date.now();   //Now it's done in a middleware to handle some issues check the .pre('save) hook
  await user.save();

  //4) Log the user in, send JWT
  const filteredUser = filterUser(user, 'name', 'email', '_id', 'active', 'role');
  createAndSendToken(filteredUser, 200, res);
  //   const token = signToken(user._id);
  //   res.status(200).json({
  //     status: 'success',
  //     token
  //   });
});

/*
 
 ##     ## ########  ########     ###    ######## ########    ########     ###     ######   ######  ##      ##  #######  ########  ########  
 ##     ## ##     ## ##     ##   ## ##      ##    ##          ##     ##   ## ##   ##    ## ##    ## ##  ##  ## ##     ## ##     ## ##     ## 
 ##     ## ##     ## ##     ##  ##   ##     ##    ##          ##     ##  ##   ##  ##       ##       ##  ##  ## ##     ## ##     ## ##     ## 
 ##     ## ########  ##     ## ##     ##    ##    ######      ########  ##     ##  ######   ######  ##  ##  ## ##     ## ########  ##     ## 
 ##     ## ##        ##     ## #########    ##    ##          ##        #########       ##       ## ##  ##  ## ##     ## ##   ##   ##     ## 
 ##     ## ##        ##     ## ##     ##    ##    ##          ##        ##     ## ##    ## ##    ## ##  ##  ## ##     ## ##    ##  ##     ## 
  #######  ##        ########  ##     ##    ##    ########    ##        ##     ##  ######   ######   ###  ###   #######  ##     ## ########  
 
*/

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)Get the user from collection
  //Gets the user and includes the password property too
  const user = await User.findById(req.user._id).select('+password');
  if (!user) return next(new AppError(`This user doesn't exist`, 400));

  //2)Check if the password is correct
  if (!(await user.correctPassword(req.body.password, user.password))) return next(new AppError(`Incorrect password`, 401));

  //3)If so, update the password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  //user.passwordChangedAt = Date.now();//Now it's done in a middleware to handle some issues check the .pre('save) hook
  await user.save();
  //3)Log user in, send JWT
  const filteredUser = filterUser(user, 'name', 'email', '_id', 'active', 'role');
  createAndSendToken(filteredUser, 200, res);
  // const token = signToken(user._id);
  // res.status(200).json({
  //     status: 'success',
  //     token
  // });
});
