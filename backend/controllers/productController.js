const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { getDivision } = require('../utils/divisionHelper'); // 🛡️ NEW: Import Helper

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private (Admin / Super Admin)
 */
exports.createProduct = async (req, res) => {
    try {
        // 🛡️ ENFORCE DIVISION on Creation
        const productPayload = { ...req.body, division: getDivision(req) };
        const product = await Product.create(productPayload);
        
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        console.error("🔥 PRODUCT CREATION CRASH:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Get all active products (Catalog view)
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 20 } = req.query;
        let query = { division: getDivision(req) };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            query.category = category;
        }

        const skipAmount = (page - 1) * limit;

        // 1. Fetch paginated products (Using .lean() for faster, editable JS objects)
        let products = await Product.find(query)
            .sort({ name: 1 }) 
            .skip(skipAmount)
            .limit(Number(limit))
            .lean();

        // 2. THE PAGINATION FIX: Gather all raw materials needed for recipes on THIS page
        const rawMaterialIds = [];
        products.forEach(p => {
            if (p.isPhysical && p.isRecipe && p.ingredients) {
                p.ingredients.forEach(ing => rawMaterialIds.push(ing.rawMaterial));
            }
        });

        // Fetch the required ingredients behind the scenes to do the math
        const ingredientsData = await Product.find({ _id: { $in: rawMaterialIds }, division: getDivision(req) }).lean();

        // 3. 🧠 THE MATH ENGINE
        products = products.map(product => {
            if (product.isPhysical && product.isRecipe && product.ingredients && product.ingredients.length > 0) {
                let maxCanMake = Infinity;

                for (let ing of product.ingredients) {
                    const rawId = ing.rawMaterial.toString();
                    const rawMaterial = ingredientsData.find(p => p._id.toString() === rawId);

                    if (!rawMaterial) {
                        maxCanMake = 0;
                        break;
                    }

                    const yieldAmount = Math.floor((rawMaterial.currentStock || 0) / ing.quantityNeeded);
                    if (yieldAmount < maxCanMake) {
                        maxCanMake = yieldAmount;
                    }
                }
                // Override the stock with the calculation
                product.currentStock = maxCanMake === Infinity ? 0 : maxCanMake;
            }
            return product;
        });

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
        // 🛡️ ENFORCE DIVISION on Update
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, division: getDivision(req) }, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!product) return res.status(404).json({ success: false, message: 'Product not found or access denied' });

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const targetId = req.params.id;
        const targetDivision = getDivision(req);

        // 1. 🛑 HARD DELETE: Vaporize the product completely
        const deletedProduct = await Product.findOneAndDelete({ 
            _id: targetId, 
            division: targetDivision 
        });

        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found or access denied.' });
        }

        // 2. 🧹 CASCADE CLEANUP: Remove this product from ALL Supplier catalogs
        // The $pull operator reaches inside the 'catalog' array and deletes the specific item match
        const supplierUpdate = await Supplier.updateMany(
            { division: targetDivision, "catalog.product": targetId },
            { $pull: { catalog: { product: targetId } } }
        );

        res.status(200).json({ 
            success: true, 
            message: `Product completely deleted. Automatically removed from ${supplierUpdate.modifiedCount} supplier catalog(s).` 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Deactivate a product
 * @route   DELETE /api/products/:id
 * @access  Private (Admin / Super Admin)
 */
exports.deactivateProduct = async (req, res) => {
    try {
        // 🛡️ ENFORCE DIVISION on Delete/Deactivate
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, division: getDivision(req) }, 
            { isActive: false }, 
            { new: true }
        );
        
        if (!product) return res.status(404).json({ success: false, message: 'Product not found or access denied' });

        res.status(200).json({ success: true, message: 'Product deactivated', data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};