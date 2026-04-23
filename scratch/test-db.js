import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const testConnection = async () => {
    console.log('Attempting to connect to MongoDB...');
    console.log('URI:', process.env.MONGO_URI);
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds instead of 10-30
        });
        console.log('SUCCESS: Connected to MongoDB!');
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Could not connect to MongoDB.');
        console.error('Error details:', err.message);
        process.exit(1);
    }
};

testConnection();
