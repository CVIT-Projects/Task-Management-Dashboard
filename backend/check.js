import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import TimeEntry from './models/TimeEntry.js';

const run = async () => {
    await connectDB();
    const entries = await TimeEntry.find().populate('task');
    console.log(JSON.stringify(entries, null, 2));
    process.exit(0);
};
run();
