const Product = require('../models/Product');

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private (Admin / Super Admin)
 */
exports.createProduct = async (req, res) => {
    try {
        // req.body now contains either the Physical payload or the Digital payload
        const product = await Product.create(req.body);
        
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        // Print the exact error to the VS Code terminal
        console.error("🔥 PRODUCT CREATION CRASH:", error.message);
        
        // Send the exact error back to React
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Get all active products (Catalog view)
 * @route   GET /api/products
 * @access  Public
 */
// NEW: Advanced Catalog Engine with Pagination & Search
exports.getProducts = async (req, res) => {
    try {
        // 1. Grab the queries from the URL (e.g., ?page=1&limit=20&search=flour)
        const { search, category, page = 1, limit = 20 } = req.query;
        
        // 2. Build the database filter
        let query = {};

        // If the user typed in a search, look in BOTH the Name and SKU fields
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } }, // 'i' means case-insensitive
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        // If the user clicked a category filter
        if (category) {
            query.category = category;
        }

        // 3. The Math for Pagination
        const skipAmount = (page - 1) * limit;

        // 4. Execute the query with limits
        const products = await Product.find(query)
            .sort({ name: 1 }) // Alphabetical order
            .skip(skipAmount)
            .limit(Number(limit));

        // 5. Count the total items so the frontend knows how many pages exist
        const totalItems = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({ 
            success: true, 
            data: products,
            pagination: {
                totalItems,
                currentPage: Number(page),
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private (Admin / Super Admin)
 */
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true, runValidators: true
        });

        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Deactivate a product (Soft delete to keep accounting history intact)
 * @route   DELETE /api/products/:id
 * @access  Private (Admin / Super Admin)
 */
exports.deactivateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        res.status(200).json({ success: true, message: 'Product deactivated', data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};