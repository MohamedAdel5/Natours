const mongoose = require('mongoose');
const validator = require('validator'); //package that's used for sanitizing and validating strings
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

//!NOOOTE: All the specified validations in this schema are applied in .pre('save') Hook So they are only applied when saving or creating documents And not on retreiving or updating data
//!NOOOTE: The properties that you add to this schema are all the related data to that user model and it might be permenanet for the user (like the name and email)
//or temporary like the (passwordChangedAt, token, tokenExpireDate)
//or not stored at all in the DB like(passwordConfirm)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'A user must have an email'],
    trim: true,
    unique: true,
    lowercase: true, //converts the string to lowercase
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: 8,
    select: false //to prevent retreiving it with the data if we requested a user object
  },
  passwordConfirm: {
    type: String,
    required: [true, 'A user must confirm his password'],
    minlength: 8,
    //!NOTE! this only works on save => .create() or .save()
    validate: {
      validator: function(val) {
        return val === this.password;
      },

      message: "The user's password has to match the confirmation password"
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

//If the password is modified hash the input password
//If the password is set for a new user then do not specify the passwordChangedAt property
//Always remove the confirm password (Note that it will be removed after the validation occurs because the validation is a .pre('save) hook that is called before this hook)
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12); // it's better that the value of the salt string length to be high but for values more than 12 it will take much time in processing (use min value 10)
    if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
    //We subtracted 1s from the passwordChangedAt property because this property is used for checking if the password is changed after a token is issued or not.
    //And in the resetPassword function we update the password (so the passwordChangedAt property is updated) and after that in the same function we issue a new token.
    //This would sometimes make a problem because they might be assigned at the same millisecond (at the same time).
    //So at this point the token issued-at time will not be greater than the passwordChangedAt time
    //So we had to subtract 1 second
  }
  this.passwordConfirm = undefined;
  next();
});

//query middleware removes the inactive users from any query
userSchema.pre(/^find/g, function(next) {
  // 'this' points to the current query
  this.find({ active: { $ne: false } }); //We didn't say active: true because some objects does not have the property (a good approach if you specify a new property in your DB so you dont have to add it to all your data)
  next();
});

//compares the given password with the actual hashed password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//Checks if the password is changed after a given token is issued
//it takes the issued-at time stamp of the token as an argument
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  //'this' points to the object that would call the function (a document i.e: user model object) [NOTE! you have to use function keyword not lambda expression]
  //now we check if the property passwordChangedAt exists
  if (this.passwordChangedAt) {
    const passChangedAttimeStamp = parseInt(
      //getTime returns timeStamp in milli seconds. I think it's not necessary to use the parseInt(n, base) function because the getTime returns a number already
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return passChangedAttimeStamp > JWTTimestamp; //if the timestamp at which the user last changed his password is greater than the issued-at time stamp of the token then this token is invalid and this function would return true
  }
  return false; //Means that the password is not changed
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex'); //genertes random 32 bytes then converts it to hexadecimal number then to string
  this.passwordResetToken = crypto //Sets the property 'passwordResetToken' in the user document
    .createHash('SHA256') //Creates a hash object that can  be used to generate digests it takes an argument 'hashingAlgorithm'
    .update(resetToken) //Updates the hash object data content with a given data that will be hashed
    .digest('hex'); //generates a digest and converts it to hex
  // console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //Sets the 'passwordResetExpires' property in the user document to 10 minuites from now
  return resetToken;
};
const User = mongoose.model('User', userSchema);

module.exports = User;
