const path = require('path')
const express = require('express');
const http = require('http');
const cors = require('cors');
//박재혆ㅎ
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* -----------------------------------------
    npm run test 
    npm run prod
----------------------------------------- */
if (process.env.NODE_ENV.trim() === 'production') {
  require('dotenv').config({ path: path.join(__dirname, '/env/prod.env') });
} else if (process.env.NODE_ENV.trim() === 'development') {
  require('dotenv').config({ path: path.join(__dirname, '/env/dev.env') });
}

/* -----------------------------------------
    PORT
----------------------------------------- */
var port = normalizePort(process.env.PORT);
app.set('port', port);

/* -----------------------------------------
    DB
----------------------------------------- */
const mongApp = require('./database/mongoDB');

/* -----------------------------------------
    AWS
----------------------------------------- */
const AWS = require('aws-sdk');
const fs = require("fs");

/* -----------------------------------------
    S3 CONFIG
----------------------------------------- */
// AWS.config.loadFromPath('./config/S3config.json');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

global.AWS_S3 = {
  s3,
  bucket: process.env.AWS_S3_BUCKET
};

/* -----------------------------------------
    AWS SES CONFIG
----------------------------------------- */
// const ses = new AWS.SES({
// 	accessKeyId: process.env.AWS_SES_ACCESS_KEY,
// 	secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
// });

// global.AWS_SES = {
// 	ses
// };

// [API] Routers
app.use('/api/v1', require('./routes/api/v1'));

// static
app.use('/', express.static(path.join(__dirname, '/dist/client')));
// app.use('/', express.static(path.join(__dirname, '../client/dist/client')));

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));
app.use('/asset', express.static(path.join(__dirname, '/asset/icons')));
// app.use('/profile_img', express.static(path.join(__dirname, '/uploads/profile_img')));

app.locals.whiteBoardFolderPath = path.join(__dirname, process.env.whiteBoardFolderName);
app.use('/white_board', express.static(app.locals.whiteBoardFolderPath));

http.createServer(app).listen(app.get('port'), () => {
  console.log(` 
    +---------------------------------------------+
    |                                                 
    |      [ Potatocs Server ]
    |
    |      - Version:`, process.env.VERSION, `
    |
    |      - Mode: ${process.env.MODE}
    |                                      
    |      - Server is running on port ${app.get('port')}
    |
    +---------------------------------------------+
    `);

  /*----------------------------------
      CONNECT TO MONGODB SERVER
  ------------------------------------*/
  mongApp.appSetObjectId(app);
});

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}


app.use(function (req, res) {
  console.log(`
    ============================================
		>>>>>> Invalid Request! <<<<<<

		Req: "${req.url}"
		=> Redirect to 'index.html'
    ============================================`)
  res.sendFile(__dirname + '/client/index.html');
});