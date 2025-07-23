const Razorpay = require('../utils/razorpayInstance');
const Payment = require('../models/Payment');

// Create Order
exports.createOrder = async (req, res) => {
  try {
    const { amount, userId, courseId } = req.body;

    const options = {
      amount: amount * 100, // ₹100 => 10000 paise
      currency: 'INR',
      receipt: `receipt_order_${Math.floor(Math.random() * 10000)}`
    };

    const order = await Razorpay.orders.create(options);

    const newPayment = new Payment({
      user: userId,
      course: courseId,
      amount,
      currency: 'INR',
      orderId: order.id,
      status: 'created'
    });

    await newPayment.save();

    res.status(201).json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Verify Payment (typically from webhook or frontend confirmation)
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, status } = req.body;

    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    payment.paymentId = paymentId;
    payment.status = status;
    payment.paidAt = new Date();
    payment.receiptUrl = `https://dashboard.razorpay.com/app/orders/${orderId}`;
    
    await payment.save();

    res.status(200).json({ success: true, message: 'Payment verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Payments (Admin)
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate('user course');
    res.status(200).json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
