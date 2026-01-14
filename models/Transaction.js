const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },

    issueDate: Date,
    returnDate: Date,
    actualReturnDate: Date,

    fine: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ['Pending', 'Issued', 'ReturnRequested', 'Returned'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
