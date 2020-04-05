module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => next(err)); //for any operational error pass it to the error middleware
  };
};
