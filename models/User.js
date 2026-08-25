const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 6,
        max: 255
    },
    email: {
        type: String,
        required: true,
        min: 6,
        max: 255
    },
    password: {
        type: String,
        required: true,
        min: 6,
        max: 1024
    },
    mobile: {
        type: String,
        required: true,
        length: 10
    },
    date: {
        type: Date,
        default: Date.now
    }

})

module.exports = mongoose.model('User', userSchema)