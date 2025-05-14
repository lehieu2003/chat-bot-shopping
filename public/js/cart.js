document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login if no token is found
        window.location.href = '/login.html';
        return;
    }

    // Auth-related UI elements
    const headerInfo = document.querySelector('.info');
    if (headerInfo) {
        // Add logout button to header
        const username = localStorage.getItem('username');
        if (username) {
            const userElement = document.createElement('div');
            userElement.classList.add('user-info');
            userElement.innerHTML = `
                <span>${username}</span>
                <button id="logout-btn" title="Đăng xuất">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
            headerInfo.appendChild(userElement);
        }
    }

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            
            // Redirect to login page
            window.location.href = '/login.html';
        });
    }

    // Load cart items
    loadCartItems();
    
    // Add event listener for the "Continue Shopping" button
    const continueShopping = document.getElementById('continue-shopping');
    if (continueShopping) {
        continueShopping.addEventListener('click', () => {
            window.location.href = '/index.html';
        });
    }

    // Add event listener for the "Checkout" button
    const checkout = document.getElementById('checkout');
    if (checkout) {
        checkout.addEventListener('click', () => {
            showPaymentModal();
        });
    }
});

async function loadCartItems() {
    try {
        const token = localStorage.getItem('token');
        const cartContainer = document.getElementById('cart-items');
        const cartSummary = document.getElementById('cart-summary');
        const cartEmpty = document.getElementById('cart-empty');
        
        if (!cartContainer || !cartSummary) {
            console.error('Cart container or summary elements not found');
            return;
        }

        // Show loading state
        cartContainer.innerHTML = '<p class="loading">Đang tải giỏ hàng...</p>';
        
        // Fetch cart data
        const response = await fetch('/api/chatbot/cart', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        });

        const data = await response.json();
        console.log('Cart data:', data);

        if (!data.success) {
            cartContainer.innerHTML = `<p class="error">${data.message || 'Có lỗi xảy ra khi tải giỏ hàng'}</p>`;
            return;
        }

        // Handle empty cart
        if (!data.cart || data.cart.length === 0) {
            cartContainer.innerHTML = '';
            cartSummary.style.display = 'none';
            if (cartEmpty) {
                cartEmpty.style.display = 'block';
            }
            return;
        }

        // Display cart items
        cartContainer.innerHTML = '';
        let totalAmount = 0;

        data.cart.forEach(item => {
            if (!item.product) {
                console.warn('Cart item missing product data:', item);
                return;
            }

            const product = item.product;
            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            const cartItem = document.createElement('div');
            cartItem.classList.add('cart-item');
            cartItem.innerHTML = `
                <div class="item-image">
                    <img src="${product.imageUrl}" alt="${product.name}">
                </div>
                <div class="item-details">
                    <h3>${product.name}</h3>
                    <p class="price">${product.price.toLocaleString('vi-VN')}đ</p>
                    <div class="item-options">
                        ${item.size ? `<span class="size">Kích thước: ${item.size}</span>` : ''}
                        ${item.color ? `<span class="color">Màu sắc: ${item.color}</span>` : ''}
                    </div>
                </div>
                <div class="item-quantity">
                    <button class="decrease-qty" data-id="${product._id}" data-size="${item.size || ''}" data-color="${item.color || ''}">-</button>
                    <span>${item.quantity}</span>
                    <button class="increase-qty" data-id="${product._id}" data-size="${item.size || ''}" data-color="${item.color || ''}">+</button>
                </div>
                <div class="item-subtotal">
                    <p>${itemTotal.toLocaleString('vi-VN')}đ</p>
                </div>
                <div class="item-actions">
                    <button class="remove-item" data-id="${product._id}" data-size="${item.size || ''}" data-color="${item.color || ''}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            cartContainer.appendChild(cartItem);
        });

        // Show summary and update total
        if (cartSummary) {
            cartSummary.style.display = 'block';
            const totalElement = document.getElementById('total-amount');
            if (totalElement) {
                totalElement.textContent = totalAmount.toLocaleString('vi-VN') + 'đ';
            }
        }
        
        // Hide empty cart message if visible
        if (cartEmpty) {
            cartEmpty.style.display = 'none';
        }

        // Add event listeners to cart item buttons
        addCartItemEventListeners();
    } catch (error) {
        console.error('Error loading cart:', error);
        const cartContainer = document.getElementById('cart-items');
        if (cartContainer) {
            cartContainer.innerHTML = '<p class="error">Có lỗi xảy ra khi tải giỏ hàng. Vui lòng thử lại sau.</p>';
        }
    }
}

function addCartItemEventListeners() {
    // Handle increase quantity
    document.querySelectorAll('.increase-qty').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const size = this.getAttribute('data-size');
            const color = this.getAttribute('data-color');
            updateCartItemQuantity(productId, 1, size, color);
        });
    });

    // Handle decrease quantity
    document.querySelectorAll('.decrease-qty').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const size = this.getAttribute('data-size');
            const color = this.getAttribute('data-color');
            updateCartItemQuantity(productId, -1, size, color);
        });
    });

    // Handle remove item
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const size = this.getAttribute('data-size');
            const color = this.getAttribute('data-color');
            removeCartItem(productId, size, color);
        });
    });
}

async function updateCartItemQuantity(productId, change, size, color) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/chatbot/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                productId,
                quantity: change,
                size,
                color
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Reload cart items to show updated state
            loadCartItems();
        } else {
            alert(data.message || 'Không thể cập nhật số lượng sản phẩm.');
        }
    } catch (error) {
        console.error('Error updating cart item quantity:', error);
        alert('Có lỗi xảy ra khi cập nhật số lượng sản phẩm.');
    }
}

async function removeCartItem(productId, size, color) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/chatbot/cart/remove', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                productId,
                size,
                color
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Reload cart items to show updated state
            loadCartItems();
        } else {
            alert(data.message || 'Không thể xóa sản phẩm khỏi giỏ hàng.');
        }
    } catch (error) {
        console.error('Error removing cart item:', error);
        alert('Có lỗi xảy ra khi xóa sản phẩm khỏi giỏ hàng.');
    }
}

function showPaymentModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.classList.add('modal-overlay');
    
    // Create modal content with improved design
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content', 'payment-modal');
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Phương thức thanh toán</h2>
            <button class="close-modal" id="close-payment-modal">×</button>
        </div>
        <div class="modal-body">
            <p class="modal-message">Vui lòng chọn phương thức thanh toán:</p>
            
            <div class="payment-methods">
                <div class="payment-method" data-method="COD">
                    <div class="payment-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="payment-details">
                        <h3>Thanh toán khi nhận hàng (COD)</h3>
                        <p>Thanh toán bằng tiền mặt khi nhận hàng</p>
                    </div>
                    <div class="payment-select">
                        <i class="far fa-circle"></i>
                    </div>
                </div>
                
                <div class="payment-method" data-method="MOMO">
                    <div class="payment-icon momo">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <div class="payment-details">
                        <h3>Ví điện tử MoMo</h3>
                        <p>Thanh toán nhanh chóng và an toàn với MoMo</p>
                    </div>
                    <div class="payment-select">
                        <i class="far fa-circle"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <div class="order-summary">
                <div class="order-items">
                    <span>Tổng số sản phẩm:</span>
                    <span id="modal-items-count">0</span>
                </div>
                <div class="order-total">
                    <span>Tổng thanh toán:</span>
                    <span id="modal-total-amount">0đ</span>
                </div>
            </div>
            <div class="modal-actions">
                <button id="cancel-payment" class="btn-secondary">Hủy</button>
                <button id="confirm-payment" class="btn-primary" disabled>Xác nhận thanh toán</button>
            </div>
        </div>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Get cart data for the summary
    updatePaymentModalSummary();
    
    // Add click event for close and cancel buttons
    document.getElementById('close-payment-modal').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    document.getElementById('cancel-payment').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // Add click events for payment methods
    const paymentMethods = document.querySelectorAll('.payment-method');
    let selectedMethod = null;
    const confirmButton = document.getElementById('confirm-payment');
    
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            // Remove selected class from all methods
            paymentMethods.forEach(m => {
                m.classList.remove('selected');
                m.querySelector('.payment-select i').className = 'far fa-circle';
            });
            
            // Add selected class to clicked method
            method.classList.add('selected');
            method.querySelector('.payment-select i').className = 'fas fa-check-circle';
            
            // Enable confirm button
            selectedMethod = method.getAttribute('data-method');
            confirmButton.removeAttribute('disabled');
        });
    });
    
    // Add click event for confirm button
    confirmButton.addEventListener('click', () => {
        if (selectedMethod) {
            processPayment(selectedMethod);
            document.body.removeChild(modalOverlay);
        }
    });
    
    // Add animation class after a small delay (for animation effect)
    setTimeout(() => {
        modalContent.classList.add('show');
    }, 10);
}

async function updatePaymentModalSummary() {
    try {
        const token = localStorage.getItem('token');
        
        // Get latest cart data
        const response = await fetch('/api/chatbot/cart', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        });

        const data = await response.json();
        
        if (data.success && data.cart) {
            // Calculate total items and amount
            let totalItems = 0;
            let totalAmount = 0;
            
            data.cart.forEach(item => {
                if (item.product) {
                    totalItems += item.quantity;
                    totalAmount += (item.product.price * item.quantity);
                }
            });
            
            // Update the modal
            const itemsCountElement = document.getElementById('modal-items-count');
            const totalAmountElement = document.getElementById('modal-total-amount');
            
            if (itemsCountElement) {
                itemsCountElement.textContent = totalItems;
            }
            
            if (totalAmountElement) {
                totalAmountElement.textContent = totalAmount.toLocaleString('vi-VN') + 'đ';
            }
        }
    } catch (error) {
        console.error('Error updating payment modal summary:', error);
    }
}

async function processPayment(paymentMethod) {
    try {
        const token = localStorage.getItem('token');
        
        // Show nicer loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.classList.add('loading-overlay');
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Đang xử lý thanh toán...</p>
                <p class="loading-subtitle">${paymentMethod === 'MOMO' ? 'Kết nối đến cổng thanh toán MoMo' : 'Đang xử lý đơn hàng'}</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        
        // Add show class for animation
        setTimeout(() => {
            loadingOverlay.classList.add('show');
        }, 10);
        
        // Call payment API
        const response = await fetch('/api/chatbot/cart/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                paymentMethod: paymentMethod
            })
        });
        
        const data = await response.json();
        
        // Remove loading indicator with fade out
        loadingOverlay.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(loadingOverlay);
        }, 300);
        
        if (!data.success) {
            throw new Error(data.message || 'Payment processing failed');
        }
        
        if (paymentMethod === 'COD') {
            // For COD, show success message and redirect to order confirmation
            showSuccessMessage('Đặt hàng thành công! Cảm ơn bạn đã mua hàng.');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 3000);
        } else if (paymentMethod === 'MOMO') {
            // For MoMo, redirect to MoMo payment URL
            if (data.paymentUrl) {
                // Store order ID for later status check
                localStorage.setItem('pendingOrderId', data.orderId);
                
                // Show redirecting message
                const redirectMessage = document.createElement('div');
                redirectMessage.classList.add('redirect-overlay');
                redirectMessage.innerHTML = `
                    <div class="redirect-content">
                        <i class="fas fa-external-link-alt"></i>
                        <p>Đang chuyển đến trang thanh toán MoMo...</p>
                    </div>
                `;
                document.body.appendChild(redirectMessage);
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = data.paymentUrl;
                }, 1000);
            } else {
                throw new Error('No payment URL received from server');
            }
        }
    } catch (error) {
        console.error('Payment error:', error);
        showErrorMessage(error.message || 'Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại.');
    }
}

function showSuccessMessage(message) {
    const successMessage = document.createElement('div');
    successMessage.classList.add('message-overlay', 'success');
    successMessage.innerHTML = `
        <div class="message-content">
            <div class="message-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3 class="message-title">Thành công!</h3>
            <p class="message-text">${message}</p>
        </div>
    `;
    document.body.appendChild(successMessage);
    
    // Add animation class
    setTimeout(() => {
        successMessage.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        successMessage.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(successMessage);
        }, 300);
    }, 3000);
}

function showErrorMessage(message) {
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('message-overlay', 'error');
    errorMessage.innerHTML = `
        <div class="message-content">
            <div class="message-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <h3 class="message-title">Lỗi!</h3>
            <p class="message-text">${message}</p>
            <button id="close-error" class="btn-primary">Đóng</button>
        </div>
    `;
    document.body.appendChild(errorMessage);
    
    // Add animation class
    setTimeout(() => {
        errorMessage.classList.add('show');
    }, 10);
    
    document.getElementById('close-error').addEventListener('click', () => {
        errorMessage.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 300);
    });
}

// Function to check MoMo transaction status (can be called when returning from MoMo payment page)
async function checkMomoTransactionStatus() {
    try {
        const orderId = localStorage.getItem('pendingOrderId');
        if (!orderId) return;
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/chatbot/momo/check-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ orderId })
        });
        
        const data = await response.json();
        
        if (data.success && data.transactionStatus.resultCode === 0) {
            // Payment successful
            showSuccessMessage('Thanh toán thành công! Cảm ơn bạn đã mua hàng.');
            localStorage.removeItem('pendingOrderId');
            loadCartItems(); // Reload cart to show it's now empty
        }
    } catch (error) {
        console.error('Error checking transaction status:', error);
    }
}

// Check for returning from MoMo payment
window.addEventListener('DOMContentLoaded', function() {
    // Check if we're returning from MoMo payment
    const urlParams = new URLSearchParams(window.location.search);
    const returnFromPayment = urlParams.get('resultCode');
    
    if (returnFromPayment) {
        // We've returned from payment, check status
        checkMomoTransactionStatus();
    }
});
