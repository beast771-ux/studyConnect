import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js'; 
import { registerUser, loginUser } from './controllers/authController.js';

dotenv.config(); 
connectDB();

const app = express();
app.use(cors());
app.use(express.json()); // Essential to read JSON from Postman

// Task 3: Auth Routes
app.post('/api/auth/signup', registerUser);
app.post('/api/auth/login', loginUser);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));