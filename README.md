# Demo Pet Store

A modern web application for a pet store that allows customers to browse and purchase pet-related products.

## Features

- Browse products by category (Food, Toys, Furniture, Accessories)
- Shopping cart functionality
- Real-time stock tracking
- Responsive design for mobile and desktop
- Product quantity controls
- Order confirmation system

## Technical Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- Static file serving
- Local storage for cart persistence

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

- `server.js` - Express server setup and API endpoints
- `index.html` - Main application page
- `products.js` - Product catalog data
- `script.js` - Client-side application logic
- `styles.css` - Application styling

## Usage

1. Browse products by using the category filters at the top of the page
2. Click the plus/minus buttons to adjust product quantities
3. Click "Add to Cart" to add items to your shopping cart
4. Click the cart icon to view your cart
5. Use the checkout button to place your order

## Development

The application uses a simple Express server to serve static files and handle API requests. Product data is stored in a JavaScript file for easy modification. The frontend uses vanilla JavaScript with no external dependencies for core functionality.
