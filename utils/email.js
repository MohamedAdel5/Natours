const nodemailer = require('nodemailer');

const sendEmail = async options => {
  //1) Create a transporter
  //NOTE THAT GMAIL is not a good idea for a production app because it limits the emails to be sent per day (500 emails per day)
  // If you'r going to use it then In your Gmail account you have to Activate the "less secure app" option
  const transporter = nodemailer.createTransport({
    // service: 'Gmail', //Gmail is a service that nodemailer supports
    host: process.env.EMAIL_HOST, //If not a supported service then use the following configuration (host and port)
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  //WE will use a tool for development called mailtrap. This tool will fake sending emails and would show us how it looks.

  //2) Define the email options
  const mailOptions = {
    from: 'user name <user@yahoo.com>',
    to: options.email,
    subject: options.subject,
    text: options.message
    //html:
  };
  //3) Send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
