const Account = require('../models/Account');

exports.getTaxSummary = async (req, res) => {
    try {
        // Fetch all potential tax and statutory accounts
        const accounts = await Account.find({ 
            $or: [
                { accountName: { $regex: /VAT/i } },
                { accountName: { $regex: /SSS/i } },
                { accountName: { $regex: /PhilHealth/i } },
                { accountName: { $regex: /Pag-IBIG/i } },
                { accountName: { $regex: /Withholding|Tax Payable/i } }
            ],
            $or: [{ isActive: true }, { isActive: { $exists: false } }]
        });

        // BIR Form Buckets
        let summary = {
            // Form 2550M / 2550Q (Value Added Tax)
            valueAddedTax: {
                outputVat: 0, // Liability (Sales)
                inputVat: 0,  // Asset (Purchases)
                netVatPayable: 0
            },
            // Statutory Benefits (SSS, PHIC, HDMF)
            statutory: {
                sss: 0,
                philhealth: 0,
                pagibig: 0,
                totalPayable: 0
            },
            // Form 1601-C (Compensation Withholding)
            withholding: {
                compensation: 0,
                expanded: 0,
                totalPayable: 0
            }
        };

        accounts.forEach(acc => {
            const name = (acc.accountName || acc.name || "").toLowerCase();
            const balance = acc.currentBalance || 0;

            // Sort into VAT
            if (name.includes('output vat')) summary.valueAddedTax.outputVat += balance;
            else if (name.includes('input vat')) summary.valueAddedTax.inputVat += balance;
            else if (name.includes('vat payable')) summary.valueAddedTax.netVatPayable += balance;
            
            // Sort into Statutory
            else if (name.includes('sss')) summary.statutory.sss += balance;
            else if (name.includes('philhealth')) summary.statutory.philhealth += balance;
            else if (name.includes('pag-ibig') || name.includes('hdmf')) summary.statutory.pagibig += balance;
            
            // Sort into Withholding
            else if (name.includes('withholding')) {
                if (name.includes('expanded')) summary.withholding.expanded += balance;
                else summary.withholding.compensation += balance;
            }
        });

        // Calculate Net VAT (Output - Input) if standard VAT Payable isn't used
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