import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // DEBUG: Check if the URI is actually loaded
        if (!process.env.MONGO_URI) {
            console.error("❌ ERROR: MONGO_URI is undefined. Check your .env file location!");
            process.exit(1);
        }

        console.log("⏳ Attempting to connect to MongoDB...");
        
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ DB Connection Error: ${error.message}`);
        // If it says "Authentication Failed", your password in .env is wrong.
        // If it says "Could not connect to any servers", it is a Network/IP issue.
        // process.exit(1);
    }
};

export default connectDB;