const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const handlerFactory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  //Object.keys(obj) is a function that returns an array of the elements in the obj
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//Route Handlers

exports.getAllUsers = handlerFactory.getAll(User);
// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const users = await User.find({});
//   res.status(200).json({
//     status: 'success',
//     results: users.length,
//     data: {
//       users
//     }
//   });
// });

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Throw an error if user tries to update a password through this handler.

  if (req.body.password || req.body.passwordConfirm)
    return next(new AppError(`This route is not for password updates. Please use 'updatePassword/'`, 400));
  //2) If not update the user document.
  //filter the body before updating
  const filteredBody = filterObj(req.body, 'name', 'email');
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true, //return the new document (after update)
    runValidators: true //run the validations
  });
  if (!updatedUser) return next(new AppError(`We couldn't update this user'`, 500));
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getUser = handlerFactory.getOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'failed',
    message: 'This route is not defined. Please use /signup instead'
  });
};

//PASSWORDS ARE NOT UPDATED WITH THIS FUNCTION
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
