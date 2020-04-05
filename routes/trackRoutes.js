const express = require('express');

const trackRouter = express.Router();

const trackController = require('./../controllers/trackController');

trackRouter.get('/:trackID', trackController.getTrack);
trackRouter.post('/', trackController.uploadTrack);

module.exports = trackRouter;
