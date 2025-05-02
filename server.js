const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Configure MercadoPago
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Create a payment preference
app.post('/create_preference', async (req, res) => {
    try {
        const { items, payer } = req.body;

        // Create preference object with ngrok URL for webhook
        const preferenceData = {
            items: items,
            back_urls: {
                success: `${req.protocol}://${req.get('host')}/success`,
                failure: `${req.protocol}://${req.get('host')}/failure`,
                pending: `${req.protocol}://${req.get('host')}/pending`
            },
            auto_return: 'approved',
            notification_url: 'https://6385-186-238-9-138.ngrok-free.app/webhook'
        };

        // Create preference in MercadoPago
        const preference = new Preference(client);
        const response = await preference.create({ body: preferenceData });

        // Return preference ID to client
        res.json({
            id: response.id,
            init_point: response.init_point
        });
    } catch (error) {
        console.error('Error creating preference:', error);
        res.status(500).json({ error: 'Error creating payment preference' });
    }
});

// Webhook for payment notifications
app.post('/webhook', async (req, res) => {
    try {
        console.log('Webhook received with query:', req.query);
        console.log('Webhook received with body:', req.body);

        let paymentId = null;

        // Handle different webhook formats
        if (req.query.type === 'payment' && req.query['data.id']) {
            // Format: { 'data.id': '123', type: 'payment' }
            paymentId = req.query['data.id'];
        } else if (req.query.topic === 'payment' && req.query.id) {
            // Format: { id: '123', topic: 'payment' }
            paymentId = req.query.id;
        } else if (req.body.data && req.body.data.id && req.body.type === 'payment') {
            // Format: { data: { id: '123' }, type: 'payment' }
            paymentId = req.body.data.id;
        } else if (req.body.resource && req.body.topic === 'payment') {
            // Format: { resource: '123', topic: 'payment' }
            paymentId = req.body.resource;
        }

        if (paymentId) {
            console.log(`Processing payment notification for payment ID: ${paymentId}`);

            try {
                const paymentClient = new Payment(client);
                const payment = await paymentClient.get({ id: paymentId });

                console.log('Payment details:', JSON.stringify(payment, null, 2));

                // Here you would typically update your database with the payment status
                // For this demo, we'll just log the payment information
            } catch (paymentError) {
                console.error('Error fetching payment details:', paymentError);
            }
        } else {
            console.log('No payment ID found in webhook notification');
        }

        // Always return 200 to acknowledge receipt of the webhook
        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Error processing webhook:', error);
        // Still return 200 to prevent MercadoPago from retrying
        res.status(200).send('Webhook received with errors');
    }
});

// Success, failure, and pending routes
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

app.get('/failure', (req, res) => {
    res.sendFile(path.join(__dirname, 'failure.html'));
});

app.get('/pending', (req, res) => {
    res.sendFile(path.join(__dirname, 'pending.html'));
});

// Get payment status
app.get('/payment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const paymentClient = new Payment(client);
        const payment = await paymentClient.get({ id: id });
        res.json(payment);
    } catch (error) {
        console.error('Error getting payment:', error);
        res.status(500).json({ error: 'Error getting payment information' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Access the app at http://localhost:${port}`);
});
