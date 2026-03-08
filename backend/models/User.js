import mongoose from 'mongoose';

/**
 * User Schema for StudyConnect
 * Defines the structure for user profiles, including 
 * credentials for secure login.
 */
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        // select: false // Optional: Use this to hide password by default in queries
    },
    role: {
        type: String,
        enum: ['Member', 'Admin'],
        default: 'Member'
    }
}, {
    // Automatically creates 'createdAt' and 'updatedAt' fields [cite: 81]
    timestamps: true 
});

const User = mongoose.model('User', userSchema);

export default User;