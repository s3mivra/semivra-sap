// Recursive helper to traverse Multi-Level BOM
const resolveBOM = async (productId, qtyToProduce, divisionId, session) => {
    let requirements = [];
    const product = await Product.findOne({ _id: productId, division: divisionId }).populate('bom.rawMaterial').session(session);
    
    if (product.isManufactured && product.bom && product.bom.length > 0) {
        for (const item of product.bom) {
            const requiredQty = item.quantity * qtyToProduce;
            // Recursion happens here
            const subReqs = await resolveBOM(item.rawMaterial._id, requiredQty, divisionId, session);
            requirements = requirements.concat(subReqs);
        }
    } else {
        // Base leaf node (Raw Material)
        requirements.push({ product: product._id, quantity: qtyToProduce, cost: product.standardCost || 0 });
    }
    return requirements;
};

exports.executeProductionRun = async (req, res) => {
    const targetDivision = req.headers['x-division-id'];
    const { finishedProductId, quantityProduced, period } = req.body;
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const rawMaterials = await resolveBOM(finishedProductId, quantityProduced, targetDivision, session);
            
            let totalCost = 0;
            // 1. Deduct all leaf-node Raw Materials
            for (const mat of rawMaterials) {
                totalCost += (mat.quantity * mat.cost);
                await StockMovement.create([{
                    division: targetDivision, product: mat.product, quantity: -mat.quantity, type: 'BOM_CONSUMPTION'
                }], { session });
            }

            // 2. Add Finished Good
            await StockMovement.create([{
                division: targetDivision, product: finishedProductId, quantity: quantityProduced, type: 'PRODUCTION'
            }], { session });

            // 3. GL Bridge: Debit FG Inventory, Credit RM Inventory
            const fgAccount = await Account.findOne({ systemCode: 'FG_INVENTORY', division: targetDivision }).session(session);
            const rmAccount = await Account.findOne({ systemCode: 'RM_INVENTORY', division: targetDivision }).session(session);

            const je = new JournalEntry({
                division: targetDivision, period,
                entryNumber: `MFG-${Date.now()}`,
                documentDate: new Date(), postingDate: new Date(),
                description: `Production: ${quantityProduced} units`,
                lines: [
                    { account: fgAccount._id, debit: totalCost, credit: 0 },
                    { account: rmAccount._id, debit: 0, credit: totalCost }
                ],
                totalDebit: totalCost, totalCredit: totalCost
            });
            await je.save({ session });
        });
        
        res.json({ message: 'Production run successfully backflushed.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
};