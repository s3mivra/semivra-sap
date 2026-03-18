const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    // Transactions on or before this date are permanently frozen
    lockedDate: { type: Date, default: '2000-01-01' }, 
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);