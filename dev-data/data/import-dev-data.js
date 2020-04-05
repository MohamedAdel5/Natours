const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const User = require('./../../models/userModel');
const Review = require('./../../models/reviewModel');

dotenv.config({ path: './config.env' });
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection is successful'));

//READ JSON FILE
const tours = JSON.parse(fs.readFileSync('./dev-data/data/tours.json', 'utf-8'));
const users = JSON.parse(fs.readFileSync('./dev-data/data/users.json', 'utf-8'));
const reviews = JSON.parse(fs.readFileSync('./dev-data/data/reviews.json', 'utf-8'));

//Import data
const importData = async data => {
  try {
    // dataJSON.foreach(el => {
    //   delete el.id;
    // }); //since the property id is not specified in the Tour schema then it will be neglected by mongoose on inserting any element so there's no benifit from using this..
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);

    console.log('data is successfully imported');
  } catch (err) {
    console.log(err);
  }
  process.exit(); //forcely exits the script
};
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();

    console.log('data is successfully deleted');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
