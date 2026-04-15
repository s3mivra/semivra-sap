const mongoose = require('mongoose');
const EmployeeProfile = require('../models/EmployeeProfile'); // 🛡️ Now using the dedicated HR model
const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const { getDivision } = require('../utils/divisionHelper'); // 🛡️ Centralized tenant helper

// @desc    Step 1: Draft a new Payroll Run
exports.draftPayroll = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const { periodStart, periodEnd } = req.body;
            const targetDivision = getDivision(req);

            if (!targetDivision) throw new Error("Division ID is required for multi-tenant isolation.");

            // 1. Fetch eligible employees strictly scoped to this tenant using the HR model
            const employees = await EmployeeProfile.find({ 
                division: targetDivision,
                baseRate: { $gt: 0 },
                isActive: true // Don't pay deactivated employees
            }).session(session);

            if (employees.length === 0) {
                throw new Error('No active employees found with compensation data. Please add employees to the HR module first.');
            }

            let totalGross = 0;
            let totalDeductions = 0;
            let totalNet = 0;
            const payslipsData = [];

            // 2. The Math Loop
            for (let emp of employees) {
                let grossPay = 0;

                if (emp.compensationType === 'Salary') {
                    grossPay = emp.baseRate / 12; // Assuming monthly draft
                } else {
                    grossPay = emp.baseRate * 80; // Assuming 80 hours per period
                }

                const taxDeduction = grossPay * 0.20; // Default 20% tax rate
                const netPay = grossPay - taxDeduction;

                totalGross += grossPay;
                totalDeductions += taxDeduction;
                totalNet += netPay;

                payslipsData.push({
                    division: targetDivision, // 🛡️ Scope to tenant
                    employee: emp._id,
                    grossPay: Number(grossPay.toFixed(2)),
                    taxDeduction: Number(taxDeduction.toFixed(2)),
                    netPay: Number(netPay.toFixed(2)),
                    status: 'Pending'
                });
            }

            // 3. Create the Master Batch
            const runRecords = await PayrollRun.create([{
                division: targetDivision,
                periodStart,
                periodEnd,
                status: 'Draft',
                totalGrossPay: Number(totalGross.toFixed(2)),
                totalDeductions: Number(totalDeductions.toFixed(2)),
                totalNetPay: Number(totalNet.toFixed(2)),
                processedBy: req.user.id
            }], { session });

            const payrollRun = runRecords[0];

            // 4. Create the individual Payslips
            const payslipsToInsert = payslipsData.map(slip => ({ ...slip, payrollRun: payrollRun._id }));
            await Payslip.insertMany(payslipsToInsert, { session });
            
            req.payrollRunData = payrollRun;
        });

        res.status(201).json({ success: true, message: 'Payroll drafted successfully!', data: req.payrollRunData });
    } catch (error) {
        console.error("Payroll Draft Error:", error);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

// @desc    Step 2: Approve & Pay (Fires the General Ledger ACID automation!)
exports.approveAndPay = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const { id } = req.params; 
            const targetDivision = getDivision(req);

            if (!targetDivision) throw new Error("Division ID is required.");

            // 🛡️ Ensure they only approve a payroll run belonging to their division
            const payrollRun = await PayrollRun.findOne({ _id: id, division: targetDivision }).session(session);
            
            if (!payrollRun) throw new Error('Payroll run not found.');
            if (payrollRun.status === 'Paid') throw new Error('Payroll has already been paid!');

            // 1. Setup the Accounts strictly scoped to this division (Auto-create safely if missing)
            let expenseAccount = await Account.findOne({ name: 'Salaries & Wages Expense', division: targetDivision }).session(session);
            if (!expenseAccount) expenseAccount = (await Account.create([{ name: 'Salaries & Wages Expense', type: 'Expense', code: '6000', division: targetDivision }], { session }))[0];
                
            let taxLiabilityAccount = await Account.findOne({ name: 'Payroll Taxes Payable', division: targetDivision }).session(session);
            if (!taxLiabilityAccount) taxLiabilityAccount = (await Account.create([{ name: 'Payroll Taxes Payable', type: 'Liability', code: '2100', division: targetDivision }], { session }))[0];
                
            let cashAccount = await Account.findOne({ name: 'Cash on Hand', division: targetDivision }).session(session);
            if (!cashAccount) cashAccount = (await Account.create([{ name: 'Cash on Hand', type: 'Asset', code: '1000', division: targetDivision }], { session }))[0];

            // Determine Financial Period (YYYY-MM)
            const dDate = new Date(payrollRun.periodStart);
            const period = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;

            // 2. Create the perfectly balanced Journal Entry
            const entryCount = await JournalEntry.countDocuments({ period, division: targetDivision }).session(session);
            const entryNumber = `PR-${period}-${String(entryCount + 1).padStart(4, '0')}`;

            await JournalEntry.create([{
                division: targetDivision,
                period,
                entryNumber,
                date: Date.now(),
                documentDate: Date.now(),
                postingDate: Date.now(),
                description: `Payroll Run: ${new Date(payrollRun.periodStart).toLocaleDateString()} - ${new Date(payrollRun.periodEnd).toLocaleDateString()}`,
                sourceDocument: payrollRun._id,
                lines: [
                    { account: expenseAccount._id, debit: payrollRun.totalGrossPay, credit: 0, memo: 'Gross Wages' },
                    { account: taxLiabilityAccount._id, debit: 0, credit: payrollRun.totalDeductions, memo: 'Tax Withholdings' },
                    { account: cashAccount._id, debit: 0, credit: payrollRun.totalNetPay, memo: 'Net Direct Deposits' }
                ],
                postedBy: req.user.id
            }], { session });

            // 3. Update the Actual Account Balances!
            expenseAccount.currentBalance = (expenseAccount.currentBalance || 0) + payrollRun.totalGrossPay; 
            taxLiabilityAccount.currentBalance = (taxLiabilityAccount.currentBalance || 0) + payrollRun.totalDeductions; 
            cashAccount.currentBalance = (cashAccount.currentBalance || 0) - payrollRun.totalNetPay; 

            await Promise.all([
                expenseAccount.save({ session }),
                taxLiabilityAccount.save({ session }),
                cashAccount.save({ session })
            ]);

            // 4. Mark the Run and all related Payslips as Paid
            payrollRun.status = 'Paid';
            payrollRun.processDate = Date.now();
            await payrollRun.save({ session });

            await Payslip.updateMany({ payrollRun: payrollRun._id, division: targetDivision }, { status: 'Paid' }, { session });
            
            req.approvedRunData = payrollRun;
        });

        res.status(200).json({ success: true, message: 'Payroll Approved and Ledger Updated!', data: req.approvedRunData });
    } catch (error) {
        console.error("Payroll Approval Error:", error);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

// @desc    Get all Payroll Runs
exports.getPayrollRuns = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division ID required' });

        // 🛡️ Scope to tenant
        const runs = await PayrollRun.find({ division: targetDivision })
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 });
            
        res.status(200).json({ success: true, data: runs });
    } catch (error) { 
        res.status(500).json({ success: false, error: error.message }); 
    }
};