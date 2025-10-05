const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const connectDB = require('../config/db');
const authRoutes = require('../routes/authRoutes');
const adminAuthRoutes = require('../routes/adminAuthRoutes')
const adminRoutes = require('../routes/adminRoutes');
const userRoutes = require('../routes/userRoutes');
const app = express();


connectDB();


app.use(cors());
app.use(express.json());
// Routes
app.use('/api/auth', authRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send({message: 'Premium Blog Backend is running successfully'});
    console.log('Homepage accessed');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));