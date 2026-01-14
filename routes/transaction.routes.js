const express = require('express');
const router = express.Router();

const Transaction = require('../models/Transaction');
const Book = require('../models/Book');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

/* ================= BASE ================= */

router.get('/', isLoggedIn, (req, res) => {
  res.redirect('/transactions/availability');
});

/* ================= USER SECTION ================= */

// View available books
router.get('/availability', isLoggedIn, async (req, res) => {
  const books = await Book.find();
  res.render('transactions/availability', {
    books,
    user: req.session.user
  });
});

// Request issue
router.post('/request-issue', isLoggedIn, async (req, res) => {
  const already = await Transaction.findOne({
    userId: req.session.user._id,
    bookId: req.body.bookId,
    status: { $in: ['Pending', 'Issued'] }
  });

  if (already) {
    return res.send('You already requested or issued this book');
  }

  await Transaction.create({
    userId: req.session.user._id,
    bookId: req.body.bookId,
    status: 'Pending'
  });

  res.redirect('/transactions/my-books');
});

// My books
router.get('/my-books', isLoggedIn, async (req, res) => {
  const issuedTransactions = await Transaction.find({
    userId: req.session.user._id
  }).populate('bookId');

  res.render('transactions/history', { issuedTransactions });
});

// Request return
router.post('/request-return', isLoggedIn, async (req, res) => {
  const tx = await Transaction.findById(req.body.txId);

  if (!tx || tx.status !== 'Issued') {
    return res.send('Invalid return request');
  }

  tx.status = 'ReturnRequested';
  await tx.save();

  res.redirect('/transactions/my-books');
});

/* ================= USER REPORTS ================= */

router.get('/my-reports', isLoggedIn, async (req, res) => {
  const transactions = await Transaction.find({
    userId: req.session.user._id
  })
    .populate('bookId')
    .sort({ createdAt: -1 });

  res.render('user/reports', { transactions });
});

/* ================= ADMIN SECTION ================= */



// Open fine page (ADMIN)
router.get('/admin/return/:id', isLoggedIn, isAdmin, async (req, res) => {
  const tx = await Transaction.findById(req.params.id)
    .populate('userId')
    .populate('bookId');

  if (!tx) return res.send('Transaction not found');

  const today = new Date();

  let lateDays = 0;
  let fine = 0;

  if (tx.returnDate && today > tx.returnDate) {
    lateDays = Math.ceil(
      (today - tx.returnDate) / (1000 * 60 * 60 * 24)
    );
    fine = lateDays * 10;
  }

  res.render('transactions/fine', {
    tx,
    fine,
    lateDays,
    today
  });
});


// Pending issue requests
router.get('/admin/pending', isLoggedIn, isAdmin, async (req, res) => {
  const pendingRequests = await Transaction.find({
    status: 'Pending',
    userId: { $ne: null },
    bookId: { $ne: null }
  })
    .populate({ path: 'userId', select: 'username' })
    .populate({ path: 'bookId', select: 'title author' });

  res.render('admin/pending', { pendingRequests });
});

// Approve issue
router.post('/admin/approve', isLoggedIn, isAdmin, async (req, res) => {
  const tx = await Transaction.findById(req.body.txId);

  const issueDate = new Date();
  const returnDate = new Date();
  returnDate.setDate(issueDate.getDate() + 15);

  tx.issueDate = issueDate;
  tx.returnDate = returnDate;
  tx.status = 'Issued';
  await tx.save();

  await Book.findByIdAndUpdate(tx.bookId, { status: 'Issued' });

  res.redirect('/transactions/admin/pending');
});

// Return requests
router.get('/admin/returns', isLoggedIn, isAdmin, async (req, res) => {
  const returnRequests = await Transaction.find({
    status: 'ReturnRequested'
  })
    .populate('userId')
    .populate('bookId');

  res.render('admin/returns', { returnRequests });
});


router.post('/admin/confirm-return', isLoggedIn, isAdmin, async (req, res) => {
  const tx = await Transaction.findById(req.body.txId);

  if (!tx) return res.send('Transaction not found');

  tx.actualReturnDate = new Date();
  tx.fine = req.body.fine;
  tx.status = 'Returned';

  await tx.save();

  await Book.findByIdAndUpdate(tx.bookId, {
    status: 'Available'
  });

  res.redirect('/transactions/admin/returns');
});


module.exports = router;
