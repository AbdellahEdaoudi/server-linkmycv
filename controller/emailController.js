const nodemailer = require('nodemailer');


exports.sendEmail = async (req, res) => {
  const { to, subject, html } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD_EMAIL
    }
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    res.json({ message: 'Email sent successfully', info });
  } catch (error) {
    console.error('Error sending email: %s', error);
    res.status(500).json({ message: 'Error sending email', error });
  }
};


exports.sendEmailAll = async (req, res) => {
  const { to, subject, html } = req.body;

  const toEmails = Array.isArray(to) ? to : [to];

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD_EMAIL
    }
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: toEmails.join(', '),
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    res.json({ message: 'Email sent successfully', info });
  } catch (error) {
    console.error('Error sending email: %s', error);
    res.status(500).json({ message: 'Error sending email', error });
  }
};
