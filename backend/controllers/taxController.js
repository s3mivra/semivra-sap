const Account = require('../models/Account');
const Tax = require('../models/Tax'); // We will create this simple model next

// 🛡️ Helper to extract tenant ID
const { getDivision } = require('../utils/divisionHelper');

// ==========================================
// 📊 REPORTING: The BIR / Statutory Summary
// ==========================================
exports.getTaxSummary = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division context missing.' });
        const divIdString = targetDivision._id ? targetDivision._id.toString() : targetDivision.toString();

        // 🛡️ CRITICAL FIX: Scoped to targetDivision ONLY
        const accounts = await Account.find({ 
            division: divIdString,
            $or: [
                { accountName: { $regex: /VAT/i } },
                { name: { $regex: /VAT/i } },
                { accountName: { $regex: /SSS/i } },
                { name: { $regex: /SSS/i } },
                { accountName: { $regex: /PhilHealth/i } },
                { name: { $regex: /PhilHealth/i } },
                { accountName: { $regex: /Pag-IBIG|HDMF/i } },
                { name: { $regex: /Pag-IBIG|HDMF/i } },
                { accountName: { $regex: /Withholding|Tax Payable/i } },
                { name: { $regex: /Withholding|Tax Payable/i } }
            ]
        });

        // BIR Form Buckets
        let summary = {
            valueAddedTax: { outputVat: 0, inputVat: 0, netVatPayable: 0 },
            statutory: { sss: 0, philhealth: 0, pagibig: 0, totalPayable: 0 },
            withholding: { compensation: 0, expanded: 0, totalPayable: 0 }
        };

        accounts.forEach(acc => {
            const name = (acc.accountName || acc.name || "").toLowerCase();
            const balance = acc.currentBalance || 0;

            if (name.includes('output vat')) summary.valueAddedTax.outputVat += balance;
            else if (name.includes('input vat')) summary.valueAddedTax.inputVat += balance;
            else if (name.includes('vat payable')) summary.valueAddedTax.netVatPayable += balance;
            
            else if (name.includes('sss')) summary.statutory.sss += balance;
            else if (name.includes('philhealth')) summary.statutory.philhealth += balance;
            else if (name.includes('pag-ibig') || name.includes('hdmf')) summary.statutory.pagibig += balance;
            
            else if (name.includes('withholding')) {
                if (name.includes('expanded')) summary.withholding.expanded += balance;
                else summary.withholding.compensation += balance;
            }
        });

        if (summary.valueAddedTax.netVatPayable === 0) {
            summary.valueAddedTax.netVatPayable = summary.valueAddedTax.outputVat - summary.valueAddedTax.inputVat;
        }

        summary.statutory.totalPayable = summary.statutory.sss + summary.statutory.philhealth + summary.statutory.pagibig;
        summary.withholding.totalPayable = summary.withholding.compensation + summary.withholding.expanded;

        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error("Tax Summary Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// ⚙️ CONFIGURATION: Statutory Rates CRUD
// ==========================================
exports.getTaxes = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        const taxes = await Tax.find({ division: targetDivision }).sort({ type: 1, name: 1 });
        res.status(200).json({ success: true, data: taxes });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createTax = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        const { name, rate, type, accountSystemCode } = req.body;

        const tax = await Tax.create({
            division: targetDivision,
            name,
            rate: Number(rate) / 100, // Convert 12% to 0.12
            type,
            accountSystemCode,
            isActive: true
        });

        res.status(201).json({ success: true, message: 'Tax configured', data: tax });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

exports.toggleTaxStatus = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        const tax = await Tax.findOne({ _id: req.params.id, division: targetDivision });
        if (!tax) return res.status(404).json({ error: 'Tax not found' });

        tax.isActive = !tax.isActive;
        await tax.save();
        res.status(200).json({ success: true, message: `Tax ${tax.isActive ? 'Activated' : 'Disabled'}` });
    } catch (error) { res.status(400).json({ error: error.message }); }
};