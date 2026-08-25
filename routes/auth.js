const router = require('express').Router()
const User = require('../models/User')
const jwt = require('jsonwebtoken')
const { registerValidation, loginValidation } = require('../utils/validation')
const bcrypt = require('bcryptjs')
const { supabase } = require('../utils/supabase')

// Register route
router.post('/register', async (req, res) => {
    try {
        // Validate user input
        const { error } = registerValidation(req.body)
        if(error) {
            console.log('Error in register validation!')
            return res.status(400).send(error.details[0].message)
        }

        // Hash password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(req.body.password, salt)

        // Supabase DB Flow
        if (supabase) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', req.body.email)
                .maybeSingle()

            if (existingUser) {
                return res.send('Email already exists')
            }

            const { data: savedUser, error: insertErr } = await supabase
                .from('users')
                .insert([{
                    name: req.body.name,
                    email: req.body.email,
                    password: hashedPassword
                }])
                .select()
                .single()

            if (insertErr) {
                console.error('Supabase register insert error:', insertErr)
                return res.status(500).send(insertErr.message)
            }

            console.log('Saved User in Supabase:', savedUser)
            return res.send(savedUser)
        }
            
        // Fallback to Mongoose if Supabase is not configured
        const checkIfEmailExists = await User.findOne({email: req.body.email})
        if(checkIfEmailExists)
            return res.send('Email already exists')

        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            mobile: req.body.mobile
        })

        const savedUser = await user.save()
        console.log('savedUser: ', savedUser)
        return res.send(savedUser)

    } catch(err){
        console.error('Register error:', err)
        return res.status(500).send(err.message || 'Database error during registration.')
    }
})

// Login route
router.post('/login', async (req, res) => {
    try {
        // Validate user input
        const { error } = loginValidation(req.body)
        if(error)
            return res.status(400).send(error.details[0].message)

        let userRegistered = null

        if (supabase) {
            const { data, error: fetchErr } = await supabase
                .from('users')
                .select('*')
                .eq('email', req.body.email)
                .maybeSingle()

            if (fetchErr) {
                console.error('Supabase login fetch error:', fetchErr)
                return res.status(500).send(fetchErr.message)
            }
            userRegistered = data
        } else {
            userRegistered = await User.findOne({ email: req.body.email })
        }

        if (!userRegistered) {
            return res.send('Email not found')
        }

        // Check password
        const validPassword = await bcrypt.compare(req.body.password, userRegistered.password)
        if(!validPassword) return res.status(400).send('Invalid password')

        const userId = userRegistered.id || userRegistered._id
        const token = jwt.sign({ _id: userId }, process.env.TOKEN || 'defaultsecrettoken')
        return res.header('auth-token', token).send(token)
    } catch(err) {
        console.error('Login error:', err)
        return res.status(500).send(err.message || 'Database error during login.')
    }
})

module.exports = router