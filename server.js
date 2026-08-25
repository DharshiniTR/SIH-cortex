const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
const PORT = process.env.PORT || 5000
require('dotenv').config()

// Import routes
const authRoute = require('./routes/auth')
const docsRoute = require('./routes/docs')
const addRoute = require('./routes/add')
const bodyParser = require("body-parser")
const { supabase } = require('./utils/supabase')

app.use(cors({
    origin: '*',
    exposedHeaders: ['auth-token']
}))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

const { MongoMemoryServer } = require('mongodb-memory-server');

// Connect to DB with automatic In-Memory fallback if offline
const connectDB = async () => {
    if (supabase) {
        console.log('⚡ Supabase Cloud Database is Active & Ready!');
        return;
    }

    const mongoUrl = process.env.MONGO_URL;

    if (mongoUrl && !mongoUrl.includes('your-mongo-url-here') && !mongoUrl.includes('localhost') && !mongoUrl.includes('127.0.0.1')) {
        try {
            await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 3000 });
            console.log('Connected to Remote MongoDB Database!');
            return;
        } catch (err) {
            console.log('Remote MongoDB connection failed:', err.message);
        }
    }

    try {
        await mongoose.connect(mongoUrl || 'mongodb://127.0.0.1:27017/digimocker', { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 2000 });
        console.log('Connected to Local MongoDB!');
    } catch (err) {
        console.log('Local MongoDB instance not reachable. Launching automatic In-Memory MongoDB server...');
        try {
            const mongoServer = await MongoMemoryServer.create();
            const memoryUri = mongoServer.getUri();
            await mongoose.connect(memoryUri, { useNewUrlParser: true, useUnifiedTopology: true });
            console.log('Connected to In-Memory MongoDB Server! Vault database ready.');
        } catch (memErr) {
            console.error('In-Memory DB launch error:', memErr.message);
        }
    }
};

connectDB();

// Routes middleware
app.use('/api/user', authRoute)
app.use('/api/docs', docsRoute)
app.use('/api/add', addRoute)

// Serve frontend build if exists
app.use(express.static(path.join(__dirname, 'frontend/dist')))
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    const indexPath = path.join(__dirname, 'frontend/dist/index.html')
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath)
    } else {
        res.send('DigiMocker Backend API is Running. Frontend not built yet.')
    }
})

app.listen(PORT, () => 
        console.log(`Server listening on port: ${PORT}`)
)