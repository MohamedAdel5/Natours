const express = require('express');

const router = express.Router();
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

//Users routes

//These route do not match the RESTful api specs but it doesn't matter
//These route use only post method So we didn't cascade any other method requestHandlers like .get() or .patch()
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

//This middleware will be applied on all routes that come after it
router.use(authController.protect);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);
router.patch('/updatePassword', authController.updatePassword);

//This middleware will be applied on all routes that come after it
router.use(authController.restrictTo('admin'));

router.route('/').get(userController.getAllUsers);
router
  .route('/:id')
  .get(userController.getUser)
  .delete(userController.deleteUser)
  .patch(userController.updateUser);

//Export router
module.exports = router;
