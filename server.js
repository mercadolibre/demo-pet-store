require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// MercadoPago Configuration
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

// Log MercadoPago configuration
console.log('MercadoPago SDK initialized with token (first 10 chars):',
    process.env.MP_ACCESS_TOKEN ? process.env.MP_ACCESS_TOKEN.substring(0, 10) + '...' : 'undefined');

// Testing endpoint to verify MercadoPago configuration
app.get('/mp-test', async (req, res) => {
    try {
        res.json({
            status: 'success',
            message: 'MercadoPago SDK initialized correctly',
            tokenFirstChars: process.env.MP_ACCESS_TOKEN ? process.env.MP_ACCESS_TOKEN.substring(0, 10) + '...' : 'undefined',
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('Error in MP test endpoint:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error testing MercadoPago configuration',
            error: error.message
        });
    }
});

// Create Preference endpoint
app.post('/create_preference', async (req, res) => {
    try {
        const { items } = req.body;

        console.log('Creating preference with items:', JSON.stringify(items));

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: true,
                message: 'Invalid items array. Must be a non-empty array.'
            });
        }

        // Following the official MercadoPago example
        const preference = new Preference(client);

        const preferenceData = {
            items: items,
            back_urls: {
                success: `${req.protocol}://${req.get('host')}/success`,
                failure: `${req.protocol}://${req.get('host')}/failure`,
                pending: `${req.protocol}://${req.get('host')}/pending`
            },
            auto_return: "approved",
            notification_url: "https://cb65-161-0-122-10.ngrok-free.app/webhook"
        };

        console.log('Preference data:', JSON.stringify(preferenceData));

        const result = await preference.create({ body: preferenceData });
        console.log('Preference created successfully:', JSON.stringify(result));

        res.json({
            id: result.id,
            init_point: result.init_point
        });
    } catch (error) {
        console.error('Error creating preference:', error);

        res.status(500).json({
            error: true,
            message: 'Error creating payment preference',
            details: error.message
        });
    }
});

// Webhook endpoint to receive MercadoPago notifications
app.post('/webhook', async (req, res) => {
    try {
        console.log('Received webhook notification:', JSON.stringify(req.body));
        console.log('Webhook query params:', JSON.stringify(req.query));

        // Get the payment ID from the query parameters
        const paymentId = req.query.id || req.query.data_id;
        const topic = req.query.topic || req.query.type;

        if (!paymentId || !topic) {
            console.log('No payment ID or topic found in webhook notification');
            return res.status(200).end(); // Respond with 200 to acknowledge receipt
        }

        console.log(`Webhook notification: Topic ${topic}, ID: ${paymentId}`);

        // Only process 'payment' type notifications
        if (topic === 'payment') {
            try {
                // Create a payment instance
                const payment = new Payment(client);

                // Get payment details
                const paymentData = await payment.get({ id: paymentId });
                console.log('Payment data retrieved:', JSON.stringify(paymentData));

                // Here you would typically update your database with the payment status
                // For this example, we'll just log the payment status
                console.log(`Payment ${paymentId} status: ${paymentData.status}`);

                // Process based on payment status
                switch(paymentData.status) {
                    case 'approved':
                        console.log(`Payment ${paymentId} was approved!`);
                        break;
                    case 'pending':
                        console.log(`Payment ${paymentId} is pending.`);
                        break;
                    case 'in_process':
                        console.log(`Payment ${paymentId} is in process.`);
                        break;
                    case 'rejected':
                        console.log(`Payment ${paymentId} was rejected.`);
                        break;
                    default:
                        console.log(`Payment ${paymentId} has status: ${paymentData.status}`);
                }
            } catch (error) {
                console.error('Error processing payment webhook:', error);
            }
        }

        // Always respond with 200 to acknowledge receipt of the webhook
        res.status(200).end();
    } catch (error) {
        console.error('Error in webhook endpoint:', error);
        res.status(200).end(); // Still respond with 200 to acknowledge receipt
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

// Test cards endpoint for easy reference
app.get('/test-cards', (req, res) => {
    res.json({
        message: 'Use these test cards for MercadoPago Checkout Pro testing',
        testCards: {
            mastercard: {
                number: '5031 7557 3453 0604',
                securityCode: '123',
                expirationDate: '11/30'
            },
            visa: {
                number: '4509 9535 6623 3704',
                securityCode: '123',
                expirationDate: '11/30'
            },
            amex: {
                number: '3711 803032 57522',
                securityCode: '1234',
                expirationDate: '11/30'
            }
        },
        cardholderNames: {
            approved: 'APRO',
            rejected: 'REJE',
            pending: 'PEND',
            callForAuth: 'CALL',
            insufficientAmount: 'FUND',
            generalError: 'OTHE'
        },
        testingTips: [
            'Use these test cards only in Sandbox/Test environment',
            'The cardholder name determines the payment outcome',
            'For Argentina, use currency_id: "ARS"',
            'Make sure your access token is for a test account'
        ]
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
