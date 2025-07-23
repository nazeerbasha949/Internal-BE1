// const fs = require('fs');
// const path = require('path');
// const PDFDocument = require('pdfkit');

// exports.generateCertificate = async ({ userName, courseTitle, outputPath }) => {
//   return new Promise((resolve, reject) => {
//     const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
//     const stream = fs.createWriteStream(outputPath);

//     doc.pipe(stream);

//     doc
//       .fontSize(26)
//       .text('Certificate of Completion', { align: 'center', underline: true });

//     doc.moveDown();
//     doc.fontSize(20).text(`This is to certify that`, { align: 'center' });
//     doc.moveDown();
//     doc.fontSize(24).text(`${userName}`, { align: 'center', bold: true });
//     doc.moveDown();
//     doc.fontSize(20).text(`has successfully completed the`, { align: 'center' });
//     doc.moveDown();
//     doc.fontSize(24).text(`${courseTitle}`, { align: 'center', bold: true });

//     doc.end();

//     stream.on('finish', () => resolve(outputPath));
//     stream.on('error', reject);
//   });
// };


// utils/certificateGenerator.js
const PDFDocument = require('pdfkit');
const stream = require('stream');

exports.generateCertificate = async ({ userName, courseTitle }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
    const bufferStream = new stream.PassThrough();
    const chunks = [];

    doc.pipe(bufferStream);

    doc
      .fontSize(26)
      .text('Certificate of Completion', { align: 'center', underline: true })
      .moveDown()
      .fontSize(20).text(`This is to certify that`, { align: 'center' })
      .moveDown()
      .fontSize(24).text(`${userName}`, { align: 'center' })
      .moveDown()
      .fontSize(20).text(`has successfully completed the`, { align: 'center' })
      .moveDown()
      .fontSize(24).text(`${courseTitle}`, { align: 'center' });

    doc.end();

    bufferStream.on('data', chunk => chunks.push(chunk));
    bufferStream.on('end', () => resolve(Buffer.concat(chunks)));
    bufferStream.on('error', reject);
  });
};
