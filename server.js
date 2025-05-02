const express = require('express');
const path = require('path');
const mercadopago = require('mercadopago');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Configure MercadoPago SDK
mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN
});

// Create preference endpoint
app.post('/create_preference', async (req, res) => {
    try {
        const { items } = req.body;

        const preference = {
            items: items.map(item => ({
                title: item.title,
                unit_price: Number(item.unit_price),
                quantity: Number(item.quantity),
            })),
            back_urls: {
                success: `${process.env.APP_URL}/success`,
                failure: `${process.env.APP_URL}/failure`,
                pending: `${process.env.APP_URL}/pending`
            },
            notification_url: `${process.env.APP_URL}/webhook`,
            auto_return: 'approved',
            binary_mode: true,
        };

        const response = await mercadopago.preferences.create(preference);
        res.json({ id: response.body.id });
    } catch (error) {
        console.error('Error creating preference:', error);
        res.status(500).json({ error: 'Error creating payment preference' });
    }
});

// Payment webhook endpoint
app.post('/webhook', async (req, res) => {
    try {
        console.log('Received webhook:', req.body);
        const { type, data } = req.body;

        if (type === 'payment') {
            const payment = await mercadopago.payment.findById(data.id);
            console.log('Payment details:', {
                id: payment.body.id,
                status: payment.body.status,
                status_detail: payment.body.status_detail,
                payment_method: payment.body.payment_method_id,
                payment_type: payment.body.payment_type_id,
                amount: payment.body.transaction_amount,
                date_created: payment.body.date_created,
                date_approved: payment.body.date_approved
            });
        } else {
            console.log('Non-payment webhook type:', type);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        console.error('Error details:', error.message);
        res.sendStatus(500);
    }
});

// Success page
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

// Failure page
app.get('/failure', (req, res) => {
    res.sendFile(path.join(__dirname, 'failure.html'));
});

// Pending page
app.get('/pending', (req, res) => {
    res.sendFile(path.join(__dirname, 'pending.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
