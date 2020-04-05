const mongoose = require('mongoose');
const Tour = require('./tourModel');
const AppError = require('./../utils/appError');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 500,
      required: [true, 'Review text cannot be empty']
    },
    rating: {
      type: Number,
      min: [0, 'Rating min value is 0'],
      max: [5, 'Rating max value is 5']
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour', //You have to validate this foreign key to ensure that the input tour id exists in the tours collection [Mongoose does not do this!]
      required: [true, 'Review must belong to a specified tour.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a specified user.']
    }
  },
  //schema options
  {
    toJSON: { virtuals: true }, //show virtual properties when providing the data as JSON
    toObject: { virtuals: true } //show virtual properties when providing the data as Objects
  }
);

//Sets a Unique constraint on user and tour fields together (user can be repeated, tour can be repeated but both can't)
reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

//Schema.methods.func ==> func will be accessible from any Document
//Schema.statics.func ==> func will be accessible from The Model
//We cannot access this function from a pre middleware because we won't have access to the model
//and the tour id will not be present because it gets accessed from the saved review document.
reviewSchema.statics.calcAverageRatings = async function(id) {
  //id==>tour ID
  const stats = await this.aggregate([
    {
      $match: { tour: id }
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(id, { ratingsQuantity: stats[0].nRatings, ratingsAverage: stats[0].avgRating });
  } else {
    await Tour.findByIdAndUpdate(id, { ratingsQuantity: 0, ratingsAverage: 4.5 });
  }
};

//runs for findByIdAndUpdate and findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  //this points to the query object
  //await this.finOne() runs the query in the 'this' object and returns a document.
  this.r = await this.findOne(); //passing data (r) from pre middleware to post middleware
  if (!this.r) return next(new AppError('No document found with that ID'));
  next();
});

reviewSchema.pre(/^find/, function(next) {
  this.populate({ path: 'tour', select: 'name' }).populate({ path: 'user', select: 'name photo' });
  next();
});

reviewSchema.post('save', function() {
  const Review = this.constructor;
  Review.calcAverageRatings(this.tour); //You can't use the model like this because the model is declared downwards so you will have to use this.constructor
});

reviewSchema.post(/^findOneAnd/, async function() {
  //this points to the new document
  //this.r is received from the pre middleware
  //this.r contains the old document
  //Note that the document is of type Model(in this case--> of type Review).
  //Note that this.constructor returns the Model Object.
  //Also this.r.constructor returns the Model Object.
  if (this.r) await this.r.constructor.calcAverageRatings(this.r.tour._id);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
