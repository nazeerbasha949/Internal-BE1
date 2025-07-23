const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendCertificateMail = async (to, name, courseTitle, certUrl) => {
  const htmlContent = `
    <div style="background-color: #f4f6f8; padding: 30px; font-family: 'Segoe UI', sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <h2 style="color: #2b5a9e;">🎉 Congratulations, ${name}!</h2>
        <p style="font-size: 16px;">
          You have <strong>successfully completed</strong> the <span style="color: #d9764a;">${courseTitle}</span> course through <strong>Signavox Career Ladder</strong>.
        </p>
        <p style="font-size: 16px;">
          We’re proud of your dedication and hard work. Your journey doesn’t stop here—keep learning and growing!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${certUrl}" target="_blank" style="background-color: #2b5a9e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            🎓 Download Your Certificate
          </a>
        </div>
        <p style="font-size: 14px; color: #777;">
          You can also access your certificate anytime from your dashboard.
        </p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 14px; text-align: center; color: #555;">
          Thank you for being part of the <strong>Signavox SCL</strong> community.
          <br><br>
          🚀 Keep Learning, Keep Growing!
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Signavox SCL" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🎓 Your Certificate for ${courseTitle} is Ready!`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendCertificateMail;
