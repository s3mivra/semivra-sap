const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');

// Load env vars
dotenv.config();

const app = express();
const corsOptions = {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-product-key', 'x-hwid', 'Accept', 'Origin', 'x-division-id']
};
// 🚨 1. CORS MUST BE THE ABSOLUTE FIRST THING 🚨
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP request logging

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Route Imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const auditRoutes = require('./routes/auditRoutes');
const posRoutes = require('./routes/posRoutes');
const purchasingRoutes = require('./routes/purchasingRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const arRoutes = require('./routes/arRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const licenseRoutes = require('./routes/licenseRoutes');
const orgRoutes = require('./routes/orgRoutes');
const journalRoutes = require('./routes/journalRoutes');
const salesRoutes = require('./routes/salesRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const taxRoutes = require('./routes/taxRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');
const fixedAssetRoutes = require('./routes/fixedAssetRoutes');
const divisionRoutes = require('./routes/divisionRoutes');
const customerRoutes = require('./routes/customerRoutes');
const periodRoutes = require('./routes/periodRoutes');
const roleRoutes = require('./routes/roleRoutes');
const manufacturingRoutes = require('./routes/manufacturingRoutes');
// 🚨 2. THE AIRLOCK (UNSHIELDED ROUTES) 🚨
// Mount these BEFORE the shield so users can log in and activate licenses!
app.use('/api/licenses', licenseRoutes);
app.use('/api/auth', authRoutes);

// 🚨 3. ACTIVATE THE GLOBAL SHIELD 🚨
// Every route placed below this line requires a valid system license to access
const licenseShield = require('./middleware/licenseShield');
app.use(licenseShield);

// 🚨 4. PROTECTED ENTERPRISE ROUTES 🚨
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/purchasing', purchasingRoutes);
app.use('/api/ar', arRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/fixed-assets', fixedAssetRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/manufacturing', manufacturingRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));