const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const License = require('../models/License');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Process a new purchase universally based on productId
 * @route   POST /api/transactions/purchase
 * @access  Private (Logged in Users)
 */
exports.processPurchase = async (req, res) => {
    try {
        const { productId, paymentMethod, paymentReference } = req.body;
        const userId = req.user.id;

        // 1. Fetch the product universally to get the source-of-truth price & rules
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ success: false, message: 'Product unavailable' });
        }

        // 2. Create the Pending Transaction (Ledger Entry)
        const transaction = await Transaction.create({
            user: userId,
            product: productId,
            amount: product.price,
            currency: product.currency,
            paymentMethod,
            paymentReference,
            status: 'Completed' // Assuming payment succeeded here. In reality, a webhook sets this.
        });

        // 3. Generate the License automatically based on product rules
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (product.durationInDays || 365));

        const newLicense = await License.create({
            licenseKey: uuidv4(),
            product: productId,
            user: userId,
            expiresAt,
            status: 'Active'
        });

        // 4. Link the license back to the financial transaction for full audit trail
        transaction.license = newLicense._id;
        await transaction.save();

        res.status(201).json({
            success: true,
            message: 'Purchase successful',
            transactionId: transaction._id,
            license: newLicense
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Get financial ledger (FICO reporting)
 * @route   GET /api/transactions
 * @access  Private (Admin / Super Admin)
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('user', 'name email')
            .populate('product', 'name sku')
            .sort({ createdAt: -1 });
            
        // Calculate total revenue on the fly
        const totalRevenue = transactions
            .filter(t => t.status === 'Completed')
            .reduce((acc, curr) => acc + curr.amount, 0);

        res.status(200).json({ success: true, count: transactions.length, totalRevenue, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};