//START THE SERVER:-
//------------------------------------------
const dotenv = require('dotenv');
const mongoose = require('mongoose');

//process inherits from the eventEmmiter class. process class emmits the events: (uncaughtException and unhandledRejection) whenever they occur
process.on('uncaughtException', err => {
  console.log('Uncaught exception');
  console.log(err.name, err.message);
  process.exit(1); //0 for success and 1 for fail
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('DB connection is successful');
    app.db = mongoose.connection.db;
  });
// .catch(err=>  console.error(err.name, err.message););  //We can use event listener to an event called unhandled event listener which will be more generic that will catch other unhandled events too and that's a better way

// console.log(process.env);

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  //we saved this value in a variable "server" in order to be able to close it useing .close() when we get any unhandled promises (rejections)
  console.log(`Running on port ${port}...`);
});

process.on('unhandledRejection', err => {
  console.log('Unhandeled rejection');
  console.log(err.name, err.message);
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
  server.close(() => {
    //in production we need a tool to restart the app after this exit
    //we have to use .close() for the server in order to finish all the current running requests first.
    process.exit(1); //0 for success and 1 for fail
  });
});

/*UNCAUGHT EXCEPTIONS EVENT LISTENER HAS TO BE ON TOP OF THE APP FILE BEFORE ANY CODE IS EXECUTED TO BE ABLE TO CATCH ANY ERRORS IN THE APP */

// process.on('uncaughtException', err => {
//   console.log('Uncaught exception');
//   console.log(err.name, err.message);
//   server.close(() => {
//     //we have to use .close() for the server in order to finish all the current running requests first.
//     process.exit(1); //0 for success and 1 for fail
//   });
// });
