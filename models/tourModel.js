const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator'); //package that's used for sanitizing and validating strings

const tourSchema = new mongoose.Schema(
  {
    //!NOOOTE: All the specified validations in this schema are applied in .pre('save') Hook So they are only applied when saving or creating documents And not on retreiving or updating data
    //the first object is for schema definition & the second is for schema options
    name: {
      type: String,
      unique: true,
      trim: true,
      //data validators
      required: [true, 'A tour must have a name'],
      maxlength: [40, 'A tour must have a length less than or equals 40 charachters'],
      minlength: [10, 'A tour must have a length more than or equals 10 charachters']
      // validate: [validator.isAlpha, 'Tour name must contain characters only'] //this uses the validator package to validate the name field to be characters only but it's not really useful because it prevents spaces too
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maximum group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        //This enum is used only for strings
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty has to be easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      //min and max can work also with dates
      min: [1, 'Rating must be above or equal 1.0'],
      max: [5, 'Rating must be below or equal 5.0']
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
      set: val => Math.round(val * 10) / 10 //4.6666 -> 46.6666 -> 47 -> 4.7
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      //this is a custom validator function that asserts that the priceDiscount is less than the price
      //you can make custom validator functions for any property (it has to be assigned to a property of name validate and it has to
      //return a boolean like the following)
      //!NOTE! this only works on save => .create() or .save()
      validate: {
        validator: function(val) {
          //NOTE!: 'this' only points to the current document when you're creating a new document, NOT on updating!
          return val < this.price;
        },
        //its a mongoose syntax if you want to access the value you have to specify it in this format ({VALUE})
        message: 'The price discount ({VALUE}) has to be less than the price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String], //array of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      //This option prevents selecting(projecting) this property by the function select() in the query class
      select: false
    },
    startDates: [Date], //array of dates

    //slug: a string that has no spaces it's like this format 'this-is-a-slug' that can be embedded in the url
    //here we specify a slug for the tour name
    slug: String,
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      //GeoJSON
      //Thats the syntax of geoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    //We didn't specify the type of the array because when the user sends a document, this array will be an array of ids guides=> [Number]
    //And when we save a document in the database this array will be an array of Users=> guides: [User]
    //This was when we tried embedding data
    // guides: Array
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  //schema options
  {
    toJSON: { virtuals: true }, //show virtual properties when providing the data as JSON
    toObject: { virtuals: true }, //show virtual properties when providing the data as Objects
    id: false //disables adding the id field to the schema
    //(the id is a virtual field while the _id is a main field that has to exist in each schema in order to be saved to database)
  }
);

//1 --> ascending -1-->descinding order
//orders the documents in the database by their price.
//this improves the performance in case we are searching for a document of price in certain range.
// tourSchema.index({ slug: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 }); //compound index
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//This is how we add a derived attribute. but it won't be saved in the database
const durationWeeks = tourSchema.virtual('durationWeeks');
durationWeeks.get(function() {
  return this.duration / 7;
});

//Populates the documents that has a foreignField that references the local field of a tour document.
//The difference between the normal poulate and the virtual popualte:
//normal populate:-
//A field is added to a certain model that references another model [Child refrencing: parent references child] and when the populate function runs,
//the mongoDB engine will get the document that has the same ObjectId specified in the field and replace the ObjectId with it in the document
//e.g: Tour model has array of references to User model and when the populate fn is called all those references will be replace with the
//corresponding documents from the User model.

//Virtual populate:-
//A virtual field is added to a model such that this field is being referenced by another model [Parent refrencing: child references parent] and when the
//populate function runs, the mongoDB engine will get the document(s) that has/have the a field(foreignField) which has the same ObjectId as the localField.
//e.g: Tour model has a virtual field that specifies the referenced Model, the localField and the foreignField.
//When the populate fn is called, the mongoDB engine gets all the documents that has the foreignField = the localField.

//Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'tour'
});

/*********************************************************************************/
//NOTE!: all middlewares has to be defined before creating a model from the schema
/*********************************************************************************/

//1)DOCUMENT MIDDLEWARE
//-----------------------

//Pre Hook is a Function that will be called before a certain event occurs.
//It's Called Hooks in mongoDB like triggers in SQL
//e.g: here we make a hook that calls a given callback function before any save event[.save() or .create()] occurs on the tour schema
tourSchema.pre('save', function(next) {
  //Here the 'this' operator references the document that is being saved
  this.slug = slugify(this.name, { lower: true });
  next(); //this function has to be called in order to proceed to the next pre middleware and so on. if it's not called then the program will get stuck forever
});

//We will not use this middleware because we won't embed users in our schema.
//We had to make another middleware for updating
//We had to import the User in this file
//We had to specify the guides as an Array only without specifying its type
// tourSchema.pre('save', async function(next) {
//   //Note: The map function is synchronous
//   //The callback function of the map function is async so the map will return promises
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   //We had to make the middleware function async in order to use guidesPromises
//   //We had to use promise.all() to await all promises of guidesPromises
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function(next) {
//   console.log('will save the document');
//   next();
// });

//post Hook is a Function that will be called after a certain event occurs
// tourSchema.post('save', function(doc, next) {
//   //doc is the saved document
//   console.log(doc);
//   next();
// });

//2) QUERY MIDDLEWARE
//-----------------------

// tourSchema.pre('find', function(next) {
//   //here the 'this' operator references the current query
//   this.find({ secretTour: { $ne: true } });
//   next();
// });

//In order to work with findById and findOne too
// tourSchema.pre('findOne', function(next) {
//   //here the 'this' operator references the current query
//   this.find({ secretTour: { $ne: true } });
//   next();
// });

/*USING REGULAR EXPRESSION IS A BETTER SOLUTION*/
tourSchema.pre(/^find/, function(next) {
  //here the 'this' operator references the current query
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// //Works only for getAll tours function
// tourSchema.pre('find', function(next) {
//   const options = { virtuals: true };
//   options.transform = (doc, ret) => {
//     //Check if the user applied selection or not. If the user did not apply any selection
//     //then this means he wants all the fields [==> model.find({})] so we will not remove virtual fields and we will perform population.
//     if (this.selected() && this._userProvidedFields) {
//       if (!this._userProvidedFields.durationWeeks) {
//         delete ret.durationWeeks;
//       }
//       if (!this._userProvidedFields.id) {
//         delete ret.id;
//       }
//     }
//     delete ret._id;
//     delete ret.__v;
//   };
//   tourSchema.set('toJSON', options);
//   next();
// });

//Befor performing any find query add populate to the query
tourSchema.pre(/^find/, function(next) {
  //here the 'this' operator references the current query

  //populate is used to exchange all the references of the referenced childs in a parent document with their documets from the database.
  //First Check if the user applied selection or not. If the user did not apply any selection
  //then this means he wants all the fields [==> model.find({})] so we will perform population.
  if (!this.selected() || this._userProvidedFields.guides) {
    this.populate({
      path: 'guides',
      select: '-__v -passwordChangedAt'
    });
  }
  //console.log(this);
  next();
});

//2) AGGREGATION MIDDLEWARE
//-----------------------

//Why do we use that?: for example here we don't want the secret tour to be calculated in any aggregation function
tourSchema.pre('aggregate', function(next) {
  //here the 'this' operator references the aggregation object which contains the pipeline object that we specify in any aggregation function.
  //console.log(this);
  // console.log(this.pipeline());
  if (!this.pipeline()[0].$geoNear) this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //push adds to the end of the array and unshift in the beginning of an array
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  // console.log(`query took ${Date.now() - this.start} ms`);
  // console.log(docs);

  next();
});

//NOTE!: Don't add any data related to the schema after declaring the model
//because the model takes the schema as a parameter which does not include your added data.
//[The code is run in sequence]
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
