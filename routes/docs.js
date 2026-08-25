const router = require('express').Router()
const mongoose = require('mongoose')
const verify = require('./verifyToken')
const Doc = require('../models/Doc')
const { supabase } = require('../utils/supabase')

// Fetch all documents for user
router.post('/', verify, async (req, res) => {
    try {
        if (supabase) {
            const { data: docs, error } = await supabase
                .from('docs')
                .select('*')
                .eq('email', req.body.email)
            if (error) throw error
            return res.send(docs || [])
        }

        const docs = await Doc.find({email: req.body.email})
        res.send(docs)
    } catch (err) {
        console.error(err)
        res.status(500).send(err.message)
    }
})

// Add new document
router.post('/add', verify, async (req, res) => {
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
                console.error('Supabase doc add error:', insertErr)
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

// Delete document endpoint (Must be defined BEFORE /:name wildcard route)
router.post('/delete', verify, async (req, res) => {
    try {
        const { email, id, name, identifier } = req.body

        if (!email) {
            return res.status(400).send('Email is required')
        }

        if (supabase) {
            let deleteSuccess = false;

            if (id) {
                const { data, error } = await supabase
                    .from('docs')
                    .delete()
                    .eq('email', email)
                    .eq('id', id)
                    .select()
                if (!error && data && data.length > 0) {
                    deleteSuccess = true;
                }
            }

            if (!deleteSuccess && (name || identifier)) {
                let query = supabase.from('docs').delete().eq('email', email)
                if (name) query = query.eq('name', name)
                if (identifier) query = query.eq('identifier', identifier)
                const { error: deleteErr } = await query
                if (deleteErr) {
                    console.error('Supabase delete error:', deleteErr)
                    return res.status(500).send(deleteErr.message)
                }
            }

            console.log('Deleted doc from Supabase:', { email, id, name, identifier })
            return res.send({ message: 'Document deleted successfully' })
        }

        // Fallback to Mongoose
        let deletedDoc = null;

        if (id && mongoose.Types.ObjectId.isValid(id)) {
            deletedDoc = await Doc.findByIdAndDelete(id);
        }

        if (!deletedDoc && (name || identifier)) {
            const deleteQuery = { email };
            if (name) deleteQuery.name = name;
            if (identifier) deleteQuery.identifier = identifier;
            deletedDoc = await Doc.findOneAndDelete(deleteQuery);
        }

        console.log('Deleted doc from MongoDB:', { email, id, name, identifier })
        return res.send({ message: 'Document deleted successfully' })

    } catch (err) {
        console.error('Delete route error:', err)
        res.status(500).send(err.message || err)
    }
})

// Fetch single document by name wildcard route (Must be defined LAST)
router.post('/:name', verify, async (req, res) => {
    try {
        if (supabase) {
            const { data: singleDoc, error } = await supabase
                .from('docs')
                .select('*')
                .eq('name', req.params.name)
                .eq('email', req.body.email)
            if (error) throw error
            return res.send(singleDoc || [])
        }

        const singleDoc = await Doc.find({name: req.params.name, email: req.body.email})
        res.send(singleDoc)
    } catch (err) {
        console.error(err)
        res.status(500).send(err.message)
    }
})

module.exports = router
