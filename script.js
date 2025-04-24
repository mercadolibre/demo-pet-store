// Shopping cart state
let cart = [];
let cartModal = document.getElementById('cart-modal');
let closeBtn = document.getElementsByClassName('close')[0];
let cartIcon = document.getElementById('cart-icon');
let emptyCartBtn = document.getElementById('empty-cart');

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('petStoreCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('petStoreCart', JSON.stringify(cart));
}

// Event listeners
cartIcon.onclick = () => cartModal.style.display = 'block';
closeBtn.onclick = () => cartModal.style.display = 'none';
emptyCartBtn.onclick = emptyCart;

window.onclick = (event) => {
    if (event.target == cartModal) {
        cartModal.style.display = 'none';
    }
};

// Initialize products
function initializeProducts() {
    console.log('Initializing products...');
    const container = document.getElementById('products-container');
    const template = document.getElementById('product-template');

    console.log('Available products:', products);
    products.forEach(product => {
        const productElement = template.content.cloneNode(true);

        // Set product data
        const card = productElement.querySelector('.product-card');
        card.dataset.category = product.category;

        const img = productElement.querySelector('.product-image');
        img.src = product.imageUrl;
        img.alt = product.title;

        productElement.querySelector('.product-title').textContent = product.title;
        productElement.querySelector('.product-description').textContent = product.description;
        productElement.querySelector('.product-price').textContent = `$${product.price}`;
        productElement.querySelector('.product-stock').textContent = `Stock: ${product.stock} units`;

        // Set up quantity controls
        const quantityInput = productElement.querySelector('.quantity-input');
        const minusBtn = productElement.querySelector('.minus');
        const plusBtn = productElement.querySelector('.plus');

        minusBtn.onclick = () => updateQuantity(quantityInput, -1, product.stock);
        plusBtn.onclick = () => updateQuantity(quantityInput, 1, product.stock);
        quantityInput.onchange = () => validateQuantity(quantityInput, product.stock);

        // Set up add to cart button
        const addToCartBtn = productElement.querySelector('.add-to-cart-btn');
        console.log('Setting up add to cart button for:', product.title);
        addToCartBtn.onclick = () => {
            console.log('Add to cart button clicked for:', product.title);
            addToCart(product, parseInt(quantityInput.value));
        };

        container.appendChild(productElement);
    });

    // Set up category filters
    setupCategoryFilters();
}

// Update quantity
function updateQuantity(input, change, maxStock) {
    let newValue = parseInt(input.value) + change;
    validateQuantity(input, maxStock, newValue);
}

// Validate quantity
function validateQuantity(input, maxStock, value = null) {
    let newValue = value !== null ? value : parseInt(input.value);
    newValue = Math.max(1, Math.min(newValue, maxStock));
    input.value = newValue;
}

// Setup category filters
function setupCategoryFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter products
            const category = btn.dataset.category;
            const products = document.querySelectorAll('.product-card');

            products.forEach(product => {
                if (category === 'all' || product.dataset.category === category) {
                    product.style.display = 'block';
                } else {
                    product.style.display = 'none';
                }
            });
        });
    });
}

// Add item to cart
function addToCart(product, quantity) {
    console.log('Adding to cart:', product, quantity);
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        // Update quantity if product already in cart
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity <= product.stock) {
            existingItem.quantity = newQuantity;
            showNotification(`Updated ${product.title} quantity to ${newQuantity}`);
        } else {
            showNotification(`Not enough stock available`, 'error');
            return;
        }
    } else {
        // Add new item to cart
        cart.push({
            id: product.id,
            title: product.title,
            unit_price: product.price,
            quantity: quantity,
            imageUrl: product.imageUrl
        });
        showNotification(`Added ${quantity} ${product.title} to cart`);
    }

    updateCartUI();
    saveCart();
}

// Remove item from cart
function removeFromCart(index) {
    const item = cart[index];
    cart.splice(index, 1);
    showNotification(`Removed ${item.title} from cart`);
    updateCartUI();
    saveCart();
}

// Empty cart
function emptyCart() {
    cart = [];
    showNotification('Cart emptied');
    updateCartUI();
    saveCart();
}

// Handle checkout
function handleCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }

    // Show loading notification
    showNotification('Processing your order...', 'info');

    // Prepare items for MercadoPago
    const items = cart.map(item => ({
        title: item.title,
        unit_price: item.unit_price,
        quantity: item.quantity
    }));

    console.log('Sending items to create_preference:', JSON.stringify(items));

    // Create preference via our backend
    fetch('/create_preference', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Preference created:', data);
        // Redirect to MercadoPago Checkout
        window.location.href = data.init_point;
    })
    .catch(error => {
        console.error('Error creating preference:', error);
        showNotification('Error processing payment. Please try again.', 'error');
    });
}

// Update cart UI
function updateCartUI() {
    // Update cart count
    const cartCount = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Update cart items
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';

    cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.title}">
            <div class="cart-item-details">
                <h3 class="cart-item-title">${item.title}</h3>
                <p class="cart-item-price">$${item.unit_price} x ${item.quantity}</p>
                <p class="cart-item-subtotal">Subtotal: $${item.unit_price * item.quantity}</p>
            </div>
            <i class="fas fa-trash remove-item" onclick="removeFromCart(${index})"></i>
        `;
        cartItems.appendChild(cartItem);
    });

    // Update total
    const total = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    document.getElementById('cart-total').textContent = `$${total}`;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize the store
document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
    loadCart();

    // Add checkout button event listener
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.5s ease-out;
    }

    .notification.error {
        background-color: #f44336;
    }

    .notification.info {
        background-color: #2196F3;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
