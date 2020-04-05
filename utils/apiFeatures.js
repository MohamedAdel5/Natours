class APIFeatures {
  constructor(
    query, //i.e: query ==> Model.find() => returns a query object
    queryStringObj //i.e: queryStringObj = req.query => returns an object that has the query string parameters
  ) {
    this.query = query;
    this.queryStringObj = queryStringObj;
    this.selectedFields = [];
  }

  filter() {
    //1)FILTERING DATA BASED ON QUERY STRING PARAMETERS
    const queryObj = { ...this.queryStringObj }; //making deep copy of the queryStringObj (not a shallow copy in order to keep the req.query object as it is)
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    //Advanced filtering
    const newQueryStr = JSON.stringify(queryObj).replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    this.query = this.query.find(JSON.parse(newQueryStr));
    //The .find() is an async function that will be run in the background while the rest of the code will continue running.
    //At this point this.query has not changed
    //when the function completes running, the query will be changed
    //at this moment the sort function will start running on the new object. It was waiting in the queue of the async functions
    //and so on
    return this;
  }

  sort() {
    //3) SORTING DATA
    if (this.queryStringObj.sort) {
      const sortStr = this.queryStringObj.sort.split(',').join(' '); //same as queryStringObj.sort.replace(',', ' ')
      this.query = this.query.sort(sortStr);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  fields() {
    //Note that you can't query a virtual property on its own if it depends on another unselected property
    //4) FIELD LIMITING
    if (this.queryStringObj.fields) {
      const infields = {};
      this.queryStringObj.fields.split(',').forEach(field => {
        infields[field] = 1;
      });
      this.selectedFields = Object.keys(infields);
      this.query = this.query.select(infields);
    }
    // } else {
    //Now done in the middleware
    //   this.query = this.query.select('-__v'); //select all elements except the __v element(that is added by mongoDB for some reason). The - uses to exclude the field
    // }
    return this;
  }

  limit() {
    //5) PAGINATION
    const page = this.queryStringObj.page * 1 || 1; //if this value is negative the -ve sign will be neglected
    const limit = this.queryStringObj.limit * 1 || 100; //if this value is negative the -ve sign will be neglected
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  //NOOOOTE::::It won't work because the virtual field does not exist in the doc._doc.
  filterVirtuals(docs) {
    docs.forEach(doc => {
      Object.keys(doc._doc).forEach(key => {
        if (!this.selectedFields.includes(key)) doc[key] = undefined;
      });
    });
  }
}

module.exports = APIFeatures;
