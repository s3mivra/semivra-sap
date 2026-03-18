const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['User', 'Admin', 'Super Admin'], 
        default: 'User' 
    },
    currentSessionToken: { type: String, default: null } // NEW: Tracks active login
}, { timestamps: true });

// Password hashing middleware
// Modern Mongoose async hook (no 'next' callback needed!)
UserSchema.pre('save', async function() {
    // If the password hasn't been modified (e.g., we are just updating the session token)
    // Simply 'return' to exit the hook and continue saving.
    if (!this.isModified('password')) {
        return; 
    }

    // If it HAS been modified (e.g., new registration or password change), hash it:
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});
module.exports = mongoose.model('User', UserSchema);