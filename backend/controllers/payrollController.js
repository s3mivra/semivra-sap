const User = require('../models/User');
const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

// @desc    Step 1: Draft a new Payroll Run (Calculates everything, but doesn't pay yet)
exports.draftPayroll = async (req, res) => {
    try {
        const { periodStart, periodEnd } = req.body;

        // 1. Fetch all eligible employees (Users who have compensation data setup)
        const employees = await User.find({ 'compensation.baseRate': { $gt: 0 } });

        if (employees.length === 0) {
            return res.status(400).json({ success: false, message: 'No employees found with active compensation data.' });
        }

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        const payslipsData = [];

        // 2. The Math Loop
        for (let emp of employees) {
            let grossPay = 0;

            // Simple monthly salary calculation (Base Rate / 12)
            // If they are hourly, in the future we will multiply baseRate * hoursWorked passed from the frontend
            if (emp.compensation.payType === 'Salary') {
                grossPay = emp.compensation.baseRate / 12; 
            } else {
                grossPay = emp.compensation.baseRate * 80; // Defaulting to 80 hours for a 2-week period for now
            }

            const taxDeduction = grossPay * (emp.compensation.taxRate || 0.20); // 20% default tax
            const netPay = grossPay - taxDeduction;

            totalGross += grossPay;
            totalDeductions += taxDeduction;
            totalNet += netPay;

            payslipsData.push({
                employee: emp._id,
                grossPay: Number(grossPay.toFixed(2)),
                taxDeduction: Number(taxDeduction.toFixed(2)),
                netPay: Number(netPay.toFixed(2)),
                status: 'Pending'
            });
        }

        // 3. Create the Master Batch (Payroll Run)
        const payrollRun = await PayrollRun.create({
            periodStart,
            periodEnd,
            status: 'Draft',
            totalGrossPay: Number(totalGross.toFixed(2)),
            totalDeductions: Number(totalDeductions.toFixed(2)),
            totalNetPay: Number(totalNet.toFixed(2)),
            processedBy: req.user.id
        });

        // 4. Create the individual Payslips linked to this batch
        const payslipsToInsert = payslipsData.map(slip => ({ ...slip, payrollRun: payrollRun._id }));
        await Payslip.insertMany(payslipsToInsert);

        res.status(201).json({ success: true, message: 'Payroll drafted successfully!', data: payrollRun });
    } catch (error) {
        console.error("Payroll Draft Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Step 2: Approve & Pay (Fires the General Ledger automation!)
exports.approveAndPay = async (req, res) => {
    try {
        const { id } = req.params; // The PayrollRun ID

        const payrollRun = await PayrollRun.findById(id);
        if (!payrollRun) return res.status(404).json({ message: 'Payroll run not found' });
        if (payrollRun.status === 'Paid') return res.status(400).json({ message: 'Payroll has already been paid!' });

        // 1. Setup the Accounts (Auto-create if missing)
        const expenseAccount = await Account.findOne({ name: 'Salaries & Wages Expense' }) 
            || await Account.create({ name: 'Salaries & Wages Expense', type: 'Expense', code: '6000' });
            
        const taxLiabilityAccount = await Account.findOne({ name: 'Payroll Taxes Payable' }) 
            || await Account.create({ name: 'Payroll Taxes Payable', type: 'Liability', code: '2100' });
            
        const cashAccount = await Account.findOne({ name: 'Cash on Hand' }) 
            || await Account.create({ name: 'Cash on Hand', type: 'Asset', code: '1000' });

        // 2. Create the perfectly balanced Journal Entry
        const entryCount = await JournalEntry.countDocuments();
        const entryNumber = `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;

        await JournalEntry.create({
            entryNumber,
            date: Date.now(),
            description: `Payroll Run: ${new Date(payrollRun.periodStart).toLocaleDateString()} - ${new Date(payrollRun.periodEnd).toLocaleDateString()}`,
            sourceDocument: payrollRun._id,
            lines: [
                // Debit the Expense (Total Cost to Business)
                { account: expenseAccount._id, debit: payrollRun.totalGrossPay, credit: 0, memo: 'Gross Wages' },
                // Credit the Liability (Taxes we owe the government)
                { account: taxLiabilityAccount._id, debit: 0, credit: payrollRun.totalDeductions, memo: 'Tax Withholdings' },
                // Credit Cash (The actual money leaving our bank account to the employees)
                { account: cashAccount._id, debit: 0, credit: payrollRun.totalNetPay, memo: 'Net Direct Deposits' }
            ],
            postedBy: req.user.id
        });

        // 3. Mark the Run and all related Payslips as Paid
        payrollRun.status = 'Paid';
        payrollRun.processDate = Date.now();
        await payrollRun.save();

        await Payslip.updateMany({ payrollRun: payrollRun._id }, { status: 'Paid' });

        res.status(200).json({ success: true, message: 'Payroll Approved and Ledger Updated!', data: payrollRun });
    } catch (error) {
        console.error("Payroll Approval Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get all Payroll Runs
exports.getPayrollRuns = async (req, res) => {
    try {
        const runs = await PayrollRun.find().populate('processedBy', 'name').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: runs });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};