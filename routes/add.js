const router = require('express').Router()
const verify = require('./verifyToken')
const Doc = require('../models/Doc')
const { supabase } = require('../utils/supabase')

router.post('/', verify, async (req, res) => {
    try {
        if (supabase) {
            const { data: existingDoc } = await supabase
                .from('docs')
                .select('*')
                .eq('email', req.body.email)
                .eq('name', req.body.name)
                .maybeSingle()

            if (existingDoc) {
                return res.send('Document already exists')
            }

            const { data: savedDoc, error: insertErr } = await supabase
                .from('docs')
                .insert([{
                    name: req.body.name,
                    email: req.body.email,
                    identifier: req.body.identifier,
                    url: req.body.url,
                    category: req.body.category || 'Government Certificate',
                    exported: false
                }])
                .select()
                .single()

            if (insertErr) {
                console.error('Supabase add error:', insertErr)
                return res.status(500).send(insertErr.message)
            }

            console.log('Saved Doc in Supabase:', savedDoc)
            return res.send(savedDoc)
        }

        // Fallback to Mongoose
        const checkIfDocExists = await Doc.findOne({email: req.body.email, name: req.body.name})
        if(checkIfDocExists)
            return res.send('Document already exists')

        const doc = new Doc({
            name: req.body.name,
            email: req.body.email,
            url: req.body.url,
            identifier: req.body.identifier
        })

        const savedDoc = await doc.save()
        console.log('savedDoc: ', savedDoc)
        res.send(savedDoc)

    } catch(err){
        console.error(err)
        res.status(400).send(err.message || err)
    }
})

module.exports = router
