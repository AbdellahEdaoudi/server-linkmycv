const mongoose = require("mongoose");

exports.connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(process.env.MONGO_URL);
        console.log(`Connected to MongoDB Atlas`);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};
