const multer = require('multer');
const mongodb = require('mongodb');
const { ObjectID } = require('mongodb');
/**
 * NodeJS Module dependencies.
 */
const { Readable } = require('stream');

// const x = mongoose.mongo.MongoClient;

module.exports.getTrack = (req, res) => {
  let trackID;
  try {
    trackID = new ObjectID(req.params.trackID);
  } catch (err) {
    return res.status(400).json({
      message: 'Invalid trackID in URL parameter. Must be a single String of 12 bytes or a string of 24 hex characters'
    });
  }
  res.set('content-type', 'audio/mp3');
  res.set('accept-ranges', 'bytes');

  const bucket = new mongodb.GridFSBucket(req.app.db, {
    bucketName: 'tracks'
  });

  const downloadStream = bucket.openDownloadStream(trackID);

  downloadStream.on('data', chunk => {
    res.write(chunk);
  });

  downloadStream.on('error', () => {
    res.sendStatus(404);
  });

  downloadStream.on('end', () => {
    res.end();
  });
};

module.exports.uploadTrack = (req, res) => {
  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage, limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 } });
  upload.single('track')(req, res, err => {
    if (err) {
      return res.status(400).json({ message: 'Upload Request Validation Failed' });
    }
    if (!req.body.name) {
      return res.status(400).json({ message: 'No track name in request body' });
    }

    const trackName = req.body.name;

    // Covert buffer to Readable Stream
    const readableTrackStream = new Readable();
    readableTrackStream.push(req.file.buffer);
    readableTrackStream.push(null);

    const bucket = new mongodb.GridFSBucket(req.app.db, {
      bucketName: 'tracks'
    });

    const uploadStream = bucket.openUploadStream(trackName);
    const { id } = uploadStream;
    readableTrackStream.pipe(uploadStream);

    uploadStream.on('error', () => {
      return res.status(500).json({ message: 'Error uploading file' });
    });

    uploadStream.on('finish', () => {
      return res.status(201).json({ message: `File uploaded successfully, stored under Mongo ObjectID: ${id}` });
    });
  });
};
