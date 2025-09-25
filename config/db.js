const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL);
    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error(error.message);
    
  }
};

module.exports = connectDB;