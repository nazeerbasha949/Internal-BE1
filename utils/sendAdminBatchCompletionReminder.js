const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendAdminBatchCompletionReminder = async (to, batchName, courseTitle, userCount) => {
  const htmlContent = `
    <div style="background-color: #f4f6f8; padding: 30px; font-family: 'Segoe UI', sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <h2 style="color: #d63031;">🚀 Course Completion Alert</h2>
        <p style="font-size: 16px;">
          <strong>Hey Admin,</strong>
        </p>
        <p style="font-size: 16px;">
          <strong>${batchName}</strong> has successfully completed the course <strong style="color: #0984e3;">${courseTitle}</strong>.
        </p>
        <p style="font-size: 16px;">
          It's time to generate certificates for <strong>${userCount}</strong> intern${userCount > 1 ? 's' : ''}.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.ADMIN_PORTAL_URL || '#'}" target="_blank" style="background-color: #0984e3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            🎓 Generate Certificates Now
          </a>
        </div>

        <hr style="margin: 30px 0;">
        <p style="font-size: 14px; text-align: center; color: #555;">
          Sent from <strong>Signavox Career Ladder System</strong>.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Signavox SCL" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🎓 Batch Course Completion – Certificate Generation Pending',
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendAdminBatchCompletionReminder;
