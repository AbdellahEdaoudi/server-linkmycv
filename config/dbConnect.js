const mongoose = require("mongoose");

// Cache connection across Vercel serverless invocations
let isConnected = false;

exports.connectDB = async () => {
    if (isConnected) return;
    if (!process.env.MONGO_URL) {
        console.error("MONGO_URL environment variable is not set!");
        return;
    }
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(process.env.MONGO_URL);
        isConnected = true;
        console.log(`Connected to MongoDB Atlas`);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};
