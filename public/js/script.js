// Tạo ID người dùng ngẫu nhiên hoặc lấy từ localStorage
let userId = localStorage.getItem('fashionbot_userId') || generateUserId();
localStorage.setItem('fashionbot_userId', userId);

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const productList = document.getElementById('product-list');

// Khởi tạo chatbot khi tải trang
window.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra lịch sử chat
    getHistory();
    
    // Hiển thị tin nhắn chào mừng nếu không có lịch sử
    if (chatMessages.children.length === 0) {
        setTimeout(() => {
            addBotMessage('Xin chào! Tôi là Fashion Advisor, trợ lý ảo tư vấn thời trang. Tôi có thể giúp bạn tìm kiếm quần áo phù hợp, tư vấn kích cỡ, phong cách và nhiều thông tin khác. Bạn cần tìm gì hôm nay?');
        }, 500);
    }
    
    // Lấy sản phẩm gợi ý từ database
    getProductRecommendations();

    // Kiểm tra thông tin giỏ hàng
    fetch(`/api/chatbot/cart/${userId}`)
        .then(response => {
            // Check if the response is valid JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Expected JSON response but got', contentType);
                return { success: false };
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.cartCount > 0) {
                updateCartBadge(data.cartCount);
            }
        })
        .catch(error => {
            console.error('Error checking cart:', error);
        });
});

// Sự kiện khi nhấn nút gửi
sendButton.addEventListener('click', sendMessage);

// Sự kiện khi nhấn Enter trong input
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Hàm gửi tin nhắn
function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Hiển thị tin nhắn của người dùng
    addUserMessage(message);
    
    // Xóa nội dung input
    userInput.value = '';
    
    // Hiển thị biểu tượng đang nhập
    showTypingIndicator();
    
    // Gửi tin nhắn tới server
    fetch('/api/chatbot/message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, message })
    })
    .then(response => response.json())
    .then(data => {
        // Ẩn biểu tượng đang nhập
        hideTypingIndicator();
        
        if (data.success) {
            // Hiển thị phản hồi từ chatbot
            addBotMessage(data.response);
            
            // Cập nhật danh sách sản phẩm gợi ý
            if (message.toLowerCase().includes('tìm') || 
                message.toLowerCase().includes('mua') ||
                message.toLowerCase().includes('gợi ý')) {
                getFeaturedProducts();
            }
        } else {
            addBotMessage('Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        hideTypingIndicator();
        addBotMessage('Xin lỗi, có lỗi kết nối. Vui lòng thử lại sau.');
    });
}

// Hàm thêm tin nhắn của người dùng vào chat
function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user-message');
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

// Hàm thêm tin nhắn của bot vào chat
function addBotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'bot-message');
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
    return messageElement;
}

// Hàm hiển thị biểu tượng đang nhập
function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.classList.add('message', 'bot-message');
    typingIndicator.innerHTML = `
        <div class="bot-thinking">
            <i class="fas fa-robot"></i>
        </div>
        <div>
            <div style="font-size: 0.85em; margin-bottom: 3px; color: #555;">Fashion Advisor đang nhập...</div>
            <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    scrollToBottom();
}

// Hàm ẩn biểu tượng đang nhập
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Hàm cuộn xuống dưới cùng của chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hàm tạo ID người dùng ngẫu nhiên
function generateUserId() {
    return 'user_' + Math.random().toString(36).substring(2, 15);
}

// Hàm lấy lịch sử chat từ server
function getHistory() {
    fetch(`/api/chatbot/history/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.history && data.history.length > 0) {
                // Hiển thị tối đa 10 tin nhắn gần nhất
                const recentHistory = data.history.slice(-10);
                
                recentHistory.forEach(item => {
                    if (item.isBot) {
                        addBotMessage(item.message);
                    } else {
                        addUserMessage(item.message);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error getting chat history:', error);
        });
}

// Hàm lấy sản phẩm gợi ý từ database
function getProductRecommendations(options = {}) {
    const { limit = 3, category, style } = options;
    
    // Xây dựng query string
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (category) queryParams.append('category', category);
    if (style) queryParams.append('style', style);
    
    // Hiển thị loading state
    productList.innerHTML = '<div class="loading">Đang tải sản phẩm...</div>';
    
    // Fetch sản phẩm từ API
    fetch(`/api/chatbot/recommendations?${queryParams.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.products && data.products.length > 0) {
                displayProducts(data.products);
            } else {
                productList.innerHTML = '<div class="no-products">Không tìm thấy sản phẩm phù hợp</div>';
            }
        })
        .catch(error => {
            console.error('Error getting product recommendations:', error);
            productList.innerHTML = '<div class="error">Lỗi khi tải sản phẩm</div>';
        });
}

// Hàm lấy sản phẩm nổi bật
function getFeaturedProducts() {
    // Phân tích từ khóa để lấy category phù hợp
    const message = userInput.value.trim().toLowerCase();
    let category = null;
    let style = null;
    
    if (message.includes('áo')) {
        category = 'tops';
    } else if (message.includes('quần')) {
        category = 'bottoms';
    } else if (message.includes('váy') || message.includes('đầm')) {
        category = 'dresses';
    } else if (message.includes('giày') || message.includes('dép')) {
        category = 'shoes';
    } else if (message.includes('khoác')) {
        category = 'outerwear';
    }
    
    if (message.includes('vintage') || message.includes('cổ điển')) {
        style = 'vintage';
    } else if (message.includes('modern') || message.includes('hiện đại')) {
        style = 'modern';
    } else if (message.includes('thể thao') || message.includes('sport')) {
        style = 'sporty';
    }
    
    // Lấy sản phẩm gợi ý dựa trên thông tin phân tích
    getProductRecommendations({ limit: 3, category, style });
}

// Hàm hiển thị danh sách sản phẩm
function displayProducts(products) {
    productList.innerHTML = '';
    
    if (!products || products.length === 0) {
        productList.innerHTML = '<div class="no-products">Không tìm thấy sản phẩm phù hợp</div>';
        return;
    }
    
    products.forEach(product => {
        // Skip invalid products
        if (!product || !product._id) return;
        
        const productItem = document.createElement('div');
        productItem.classList.add('product-item');
        
        const imageUrl = product.imageUrl || 'https://via.placeholder.com/80?text=No+Image';
        const formattedPrice = parseInt(product.price).toLocaleString('vi-VN');
        
        productItem.innerHTML = `
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}">
            </div>
            <div class="product-details">
                <h4>${product.name}</h4>
                <p>${product.description ? product.description.substring(0, 50) + '...' : product.subCategory || ''}</p>
                <div class="product-price">${formattedPrice}₫</div>
                <div class="product-action">
                    <button class="view-btn" data-id="${product._id}">Xem chi tiết</button>
                    <button class="add-btn" data-id="${product._id}">Thêm vào giỏ</button>
                </div>
            </div>
        `;
        
        // Add event listeners after creating the buttons
        const viewBtn = productItem.querySelector('.view-btn');
        const addBtn = productItem.querySelector('.add-btn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                showProductDetails(productId);
            });
        }
        
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                addToCart(productId);
            });
        }
        
        productList.appendChild(productItem);
    });
}

// Hàm xem chi tiết sản phẩm
function showProductDetails(productId) {
    // Hiển thị loading message trong chat
    addUserMessage(`Tôi muốn xem thông tin chi tiết về sản phẩm này`);
    showTypingIndicator();
    
    // Validate productId before sending the request
    if (!productId || productId === 'undefined') {
        hideTypingIndicator();
        addBotMessage("Xin lỗi, không thể xác định sản phẩm để hiển thị chi tiết.");
        return;
    }
    
    // Gọi API để lấy chi tiết sản phẩm từ database
    fetch(`/api/chatbot/product/${productId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            hideTypingIndicator();
            if (data.success && data.product) {
                const product = data.product;
                
                // Format thông tin sản phẩm
                let detailMsg = `📋 *THÔNG TIN SẢN PHẨM*\n\n`;
                detailMsg += `📝 Tên: ${product.name}\n`;
                detailMsg += `🏷️ Loại: ${product.subCategory}\n`;
                detailMsg += `💰 Giá: ${parseInt(product.price).toLocaleString('vi-VN')}đ\n`;
                
                if (product.colors && product.colors.length > 0) {
                    detailMsg += `🎨 Màu sắc: ${product.colors.join(', ')}\n`;
                }
                
                if (product.sizes && product.sizes.length > 0) {
                    detailMsg += `📏 Kích cỡ: ${product.sizes.join(', ')}\n`;
                }
                
                if (product.material) {
                    detailMsg += `🧵 Chất liệu: ${product.material}\n`;
                }
                
                if (product.occasions && product.occasions.length > 0) {
                    detailMsg += `🎭 Phù hợp cho: ${product.occasions.join(', ')}\n`;
                }
                
                if (product.style && product.style.length > 0) {
                    detailMsg += `👗 Phong cách: ${product.style.join(', ')}\n`;
                }
                
                if (product.description) {
                    detailMsg += `\n📄 Mô tả: ${product.description}\n`;
                }
                
                detailMsg += `\n✅ Tình trạng: ${product.inStock ? 'Còn hàng' : 'Hết hàng'}`;
                
                // Hiển thị thông tin sản phẩm trong chat
                addBotMessage(detailMsg);
                
                // Hiển thị gợi ý bổ sung
                setTimeout(() => {
                    addBotMessage("Bạn có muốn thêm sản phẩm này vào giỏ hàng hoặc xem các sản phẩm tương tự không?");
                }, 1000);
                
                // Tự động lấy các sản phẩm tương tự
                getSimilarProducts(product.category, product._id);
            } else {
                addBotMessage("Xin lỗi, tôi không tìm thấy thông tin chi tiết về sản phẩm này.");
            }
        })
        .catch(error => {
            hideTypingIndicator();
            console.error('Error fetching product details:', error);
            addBotMessage("Xin lỗi, đã xảy ra lỗi khi lấy thông tin chi tiết sản phẩm. Vui lòng thử lại sau.");
        });
}

// Hàm lấy các sản phẩm tương tự
function getSimilarProducts(category, currentProductId) {
    const queryParams = new URLSearchParams({
        category: category,
        exclude: currentProductId,
        limit: 3
    });
    
    // Thay đổi tiêu đề phần gợi ý
    const suggestionsHeader = document.querySelector('.product-suggestions h3');
    if (suggestionsHeader) {
        suggestionsHeader.textContent = 'Sản phẩm tương tự';
    }
    
    // Gọi API lấy sản phẩm tương tự
    fetch(`/api/chatbot/similar-products?${queryParams.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.products && data.products.length > 0) {
                displayProducts(data.products);
            } else {
                productList.innerHTML = '<div class="no-products">Không tìm thấy sản phẩm tương tự</div>';
            }
        })
        .catch(error => {
            console.error('Error getting similar products:', error);
            productList.innerHTML = '<div class="error">Lỗi khi tải sản phẩm tương tự</div>';
        });
}

// Hàm thêm sản phẩm vào giỏ hàng
function addToCart(productId) {
    // Hiển thị thông báo loading
    const addingMessage = addBotMessage("Đang thêm sản phẩm vào giỏ hàng...");
    
    console.log(`Adding product ${productId} to cart for user ${userId}`);
    
    // API call để thêm vào giỏ hàng
    fetch('/api/chatbot/cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            userId, 
            productId, 
            quantity: 1 
        })
    })
    .then(response => {
        console.log('Cart API response status:', response.status);
        // Check if the response is valid JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
        }
        
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || 'Server error');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Cart API response data:', data);
        if (data.success) {
            // Cập nhật thông báo thành công và thêm các nút tương tác
            addingMessage.textContent = `✅ Đã thêm sản phẩm vào giỏ hàng! Giỏ hàng của bạn hiện có ${data.cartCount} sản phẩm.`;
            
            // Hiển thị số lượng giỏ hàng trên UI nếu có element
            updateCartBadge(data.cartCount);
            
            // Tạo các nút tương tác cho người dùng lựa chọn
            setTimeout(() => {
                const actionMessage = document.createElement('div');
                actionMessage.classList.add('message', 'bot-message', 'action-buttons');
                actionMessage.innerHTML = `
                    <div>Bạn có muốn xem giỏ hàng không?</div>
                    <div class="button-container">
                        <button class="action-btn view-cart-btn">Xem giỏ hàng</button>
                        <button class="action-btn continue-shopping-btn">Tiếp tục mua sắm</button>
                    </div>
                `;
                
                // Thêm event listeners cho các nút
                chatMessages.appendChild(actionMessage);
                scrollToBottom();
                
                const viewCartBtn = actionMessage.querySelector('.view-cart-btn');
                if (viewCartBtn) {
                    viewCartBtn.addEventListener('click', function() {
                        // Xóa nút tương tác sau khi nhấn
                        this.closest('.action-buttons').remove();
                        // Hiển thị giỏ hàng
                        viewCart();
                    });
                }
                
                const continueShoppingBtn = actionMessage.querySelector('.continue-shopping-btn');
                if (continueShoppingBtn) {
                    continueShoppingBtn.addEventListener('click', function() {
                        // Xóa nút tương tác sau khi nhấn
                        this.closest('.action-buttons').remove();
                        // Hiển thị thông báo tiếp tục mua sắm
                        addBotMessage("Tuyệt! Hãy tiếp tục khám phá các sản phẩm khác.");
                    });
                }
            }, 1000);
        } else {
            addingMessage.textContent = `❌ ${data.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng. Vui lòng thử lại.'}`;
        }
    })
    .catch(error => {
        console.error('Error adding to cart:', error);
        addingMessage.textContent = '❌ Có lỗi kết nối đến server. Vui lòng thử lại sau.';
    });
}

// Hàm cập nhật số lượng sản phẩm trong giỏ hàng trên UI
function updateCartBadge(count) {
    // Tạo hoặc cập nhật badge hiển thị số lượng giỏ hàng
    let cartBadge = document.getElementById('cart-badge');
    
    if (!cartBadge) {
        // Tạo badge mới nếu chưa có
        cartBadge = document.createElement('div');
        cartBadge.id = 'cart-badge';
        cartBadge.className = 'cart-badge';
        document.querySelector('.chat-header').appendChild(cartBadge);
        
        // Thêm sự kiện click để xem giỏ hàng
        cartBadge.addEventListener('click', viewCart);
    }
    
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'flex' : 'none';
}

// Hàm xem giỏ hàng
function viewCart() {
    // Hiển thị loading message
    addUserMessage("Xem giỏ hàng của tôi");
    showTypingIndicator();
    
    console.log(`Fetching cart for user ${userId}`);
    
    // Gọi API để lấy thông tin giỏ hàng
    fetch(`/api/chatbot/cart/${userId}`)
        .then(response => {
            console.log('Cart GET response status:', response.status);
            
            // Check if the response is valid JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
            }
            
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || 'Server error');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.cart && data.cart.length > 0) {
                // Format thông tin giỏ hàng
                let cartMsg = `🛒 *GIỎ HÀNG CỦA BẠN* (${data.cartCount} sản phẩm)\n\n`;
                
                let totalAmount = 0;
                data.cart.forEach((item, index) => {
                    if (!item.product) {
                        cartMsg += `${index + 1}. [Sản phẩm không còn tồn tại]\n\n`;
                        return;
                    }
                    
                    const product = item.product;
                    const itemPrice = product.price * item.quantity;
                    totalAmount += itemPrice;
                    
                    cartMsg += `${index + 1}. ${product.name}\n`;
                    cartMsg += `   Số lượng: ${item.quantity}\n`;
                    if (item.size) cartMsg += `   Kích cỡ: ${item.size}\n`;
                    if (item.color) cartMsg += `   Màu sắc: ${item.color}\n`;
                    cartMsg += `   Giá: ${parseInt(product.price).toLocaleString('vi-VN')}đ x ${item.quantity} = ${parseInt(itemPrice).toLocaleString('vi-VN')}đ\n\n`;
                });
                
                cartMsg += `Tổng tiền: ${parseInt(totalAmount).toLocaleString('vi-VN')}đ`;
                
                // Hiển thị thông tin giỏ hàng
                hideTypingIndicator();
                addBotMessage(cartMsg);
                
                // Hiển thị gợi ý tiếp theo cùng các nút hành động
                setTimeout(() => {
                    const actionMessage = document.createElement('div');
                    actionMessage.classList.add('message', 'bot-message', 'action-buttons');
                    actionMessage.innerHTML = `
                        <div>Bạn có muốn tiếp tục mua sắm hay thanh toán?</div>
                        <div class="button-container">
                            <button class="action-btn continue-shopping-btn">Tiếp tục mua sắm</button>
                            <button class="action-btn checkout-btn">Thanh toán ngay</button>
                        </div>
                    `;
                    
                    // Thêm message vào chat
                    chatMessages.appendChild(actionMessage);
                    scrollToBottom();
                    
                    // Thêm sự kiện cho nút tiếp tục mua sắm
                    const continueShoppingBtn = actionMessage.querySelector('.continue-shopping-btn');
                    if (continueShoppingBtn) {
                        continueShoppingBtn.addEventListener('click', function() {
                            this.closest('.action-buttons').remove();
                            addBotMessage("Tuyệt! Hãy tiếp tục khám phá các sản phẩm khác.");
                        });
                    }
                    
                    // Thêm sự kiện cho nút thanh toán
                    const checkoutBtn = actionMessage.querySelector('.checkout-btn');
                    if (checkoutBtn) {
                        checkoutBtn.addEventListener('click', function() {
                            this.closest('.action-buttons').remove();
                            initiateCheckout();
                        });
                    }
                }, 1000);
            } else {
                hideTypingIndicator();
                addBotMessage("Giỏ hàng của bạn hiện đang trống. Hãy thêm một số sản phẩm vào giỏ hàng!");
            }
        })
        .catch(error => {
            hideTypingIndicator();
            console.error('Error fetching cart:', error);
            addBotMessage("Xin lỗi, có lỗi kết nối đến server. Vui lòng thử lại sau.");
        });
}

// Hàm bắt đầu quá trình thanh toán
function initiateCheckout() {
    addBotMessage("Đang chuẩn bị thanh toán cho đơn hàng của bạn...");
    
    // Hiển thị form thanh toán
    showTypingIndicator();
    
    // Lấy thông tin giỏ hàng từ server
    fetch(`/api/chatbot/cart/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            hideTypingIndicator();
            
            if (!data.success || !data.cart || data.cart.length === 0) {
                addBotMessage("Giỏ hàng của bạn đang trống, không thể thanh toán.");
                return;
            }
            
            // Hiển thị form thu thập thông tin thanh toán
            const checkoutForm = document.createElement('div');
            checkoutForm.classList.add('message', 'bot-message', 'checkout-form');
            
            // Tính tổng tiền
            let totalAmount = 0;
            let itemCount = 0;
            data.cart.forEach(item => {
                if (item.product) {
                    totalAmount += item.product.price * item.quantity;
                    itemCount += item.quantity;
                }
            });
            
            // Tạo danh sách sản phẩm rút gọn
            let productSummary = '';
            const maxProductsToShow = 2;
            
            data.cart.slice(0, maxProductsToShow).forEach(item => {
                if (item.product) {
                    productSummary += `
                        <div class="checkout-item">
                            <div class="checkout-item-image">
                                <img src="${item.product.imageUrl || 'https://via.placeholder.com/40?text=No+Image'}" alt="${item.product.name}">
                            </div>
                            <div class="checkout-item-details">
                                <div class="checkout-item-name">${item.product.name}</div>
                                <div class="checkout-item-price">${parseInt(item.product.price).toLocaleString('vi-VN')}đ × ${item.quantity}</div>
                            </div>
                        </div>
                    `;
                }
            });
            
            if (data.cart.length > maxProductsToShow) {
                const remainingItems = data.cart.length - maxProductsToShow;
                productSummary += `<div class="checkout-more-items">+ ${remainingItems} sản phẩm khác</div>`;
            }
            
            checkoutForm.innerHTML = `
                <div class="checkout-container">
                    <div class="checkout-header">
                        <div class="checkout-title">
                            <i class="fas fa-shopping-bag"></i>
                            Thanh toán đơn hàng
                        </div>
                        <div class="checkout-step">Bước 1/2: Thông tin đặt hàng</div>
                    </div>
                    
                    <div class="checkout-summary-box">
                        <div class="checkout-order-summary">
                            <div class="summary-header">Tóm tắt đơn hàng</div>
                            <div class="summary-products">
                                ${productSummary}
                            </div>
                            <div class="summary-details">
                                <div class="summary-row">
                                    <span>Tổng ${itemCount} sản phẩm:</span>
                                    <span>${parseInt(totalAmount).toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div class="summary-row">
                                    <span>Phí vận chuyển:</span>
                                    <span>Miễn phí</span>
                                </div>
                                <div class="summary-row total">
                                    <span>Tổng thanh toán:</span>
                                    <span>${parseInt(totalAmount).toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <form id="checkout-form" class="checkout-customer-form">
                        <div class="form-section">
                            <h4 class="form-section-title">Thông tin người nhận</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="customer-name">Họ và tên <span class="required">*</span></label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-user"></i>
                                        <input type="text" id="customer-name" required placeholder="Nhập họ và tên của bạn">
                                    </div>
                                    <div class="form-error" id="name-error"></div>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="customer-phone">Số điện thoại <span class="required">*</span></label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-phone"></i>
                                        <input type="tel" id="customer-phone" required placeholder="Nhập số điện thoại">
                                    </div>
                                    <div class="form-error" id="phone-error"></div>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="customer-email">Email</label>
                                    <div class="input-with-icon">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="customer-email" placeholder="Nhập email (không bắt buộc)">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4 class="form-section-title"><i class="fas fa-map-marker-alt"></i> Địa chỉ giao hàng</h4>
                            <div class="form-row">
                                <div class="form-group full-width">
                                    <label for="customer-address">Địa chỉ chi tiết <span class="required">*</span></label>
                                    <div class="input-with-icon textarea modern">
                                        <i class="fas fa-home"></i>
                                        <textarea id="customer-address" required placeholder="Nhập địa chỉ nhận hàng (số nhà, đường, phường/xã,...)"></textarea>
                                    </div>
                                    <div class="form-error" id="address-error"></div>
                                </div>
                            </div>
                            <div class="form-row responsive-row">
                                <div class="form-group">
                                    <label for="customer-city">Tỉnh/Thành phố <span class="required">*</span></label>
                                    <div class="select-wrapper">
                                        <select id="customer-city" class="styled-select" required>
                                            <option value="">Chọn Tỉnh/Thành phố</option>
                                            <option value="HN">Hà Nội</option>
                                            <option value="HCM">TP. Hồ Chí Minh</option>
                                            <option value="DN">Đà Nẵng</option>
                                            <option value="HP">Hải Phòng</option>
                                            <option value="CT">Cần Thơ</option>
                                            <!-- Thêm các tỉnh thành khác nếu cần -->
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="customer-district">Quận/Huyện <span class="required">*</span></label>
                                    <div class="select-wrapper">
                                        <select id="customer-district" class="styled-select" required disabled>
                                            <option value="">Chọn Quận/Huyện</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4 class="form-section-title">Phương thức thanh toán</h4>
                            <div class="payment-methods">
                                <label class="payment-method-card">
                                    <input type="radio" name="payment-method" value="cod" checked>
                                    <div class="payment-method-content">
                                        <div class="payment-icon">
                                            <i class="fas fa-money-bill-wave"></i>
                                        </div>
                                        <div class="payment-details">
                                            <div class="payment-name">Thanh toán khi nhận hàng</div>
                                            <div class="payment-description">Thanh toán bằng tiền mặt khi nhận được hàng</div>
                                        </div>
                                    </div>
                                </label>
                                
                                <label class="payment-method-card">
                                    <input type="radio" name="payment-method" value="bank-transfer">
                                    <div class="payment-method-content">
                                        <div class="payment-icon">
                                            <i class="fas fa-university"></i>
                                        </div>
                                        <div class="payment-details">
                                            <div class="payment-name">Chuyển khoản ngân hàng</div>
                                            <div class="payment-description">Thông tin chuyển khoản sẽ hiển thị sau khi đặt hàng</div>
                                        </div>
                                    </div>
                                </label>
                                
                                <label class="payment-method-card">
                                    <input type="radio" name="payment-method" value="momo">
                                    <div class="payment-method-content">
                                        <div class="payment-icon momo-icon">
                                            <img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" alt="MoMo">
                                        </div>
                                        <div class="payment-details">
                                            <div class="payment-name">Ví MoMo</div>
                                            <div class="payment-description">Thanh toán qua ví điện tử MoMo</div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4 class="form-section-title">Ghi chú</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <textarea id="customer-note" placeholder="Ghi chú cho đơn hàng (không bắt buộc)"></textarea>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="cancel-btn">
                                <i class="fas fa-arrow-left"></i> Quay lại
                            </button>
                            <button type="submit" class="confirm-btn">
                                Đặt hàng <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            chatMessages.appendChild(checkoutForm);
            scrollToBottom();
            
            // Thêm sự kiện cho select tỉnh/thành phố
            const citySelect = document.getElementById('customer-city');
            const districtSelect = document.getElementById('customer-district');
            
            if (citySelect) {
                citySelect.addEventListener('change', function() {
                    const cityValue = this.value;
                    if (cityValue && districtSelect) {
                        // Enable district select
                        districtSelect.disabled = false;
                        
                        // Clear current options
                        districtSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
                        
                        // Add new options based on selected city
                        if (cityValue === 'HN') {
                            addDistrictOptions(['Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Cầu Giấy']);
                        } else if (cityValue === 'HCM') {
                            addDistrictOptions(['Quận 1', 'Quận 3', 'Quận 4', 'Quận 7', 'Thủ Đức']);
                        } else if (cityValue === 'DN') {
                            addDistrictOptions(['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu']);
                        } else if (cityValue === 'HP') {
                            addDistrictOptions(['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Kiến An', 'Hải An']);
                        } else if (cityValue === 'CT') {
                            addDistrictOptions(['Ninh Kiều', 'Cái Răng', 'Bình Thủy', 'Ô Môn', 'Thốt Nốt']);
                        }
                    } else {
                        districtSelect.disabled = true;
                    }
                });
            }
            
            function addDistrictOptions(districts) {
                districts.forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    option.textContent = district;
                    districtSelect.appendChild(option);
                });
            }
            
            // Xử lý sự kiện cancel
            const cancelBtn = checkoutForm.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    checkoutForm.remove();
                    addBotMessage("Đã hủy quá trình thanh toán. Bạn có thể tiếp tục mua sắm hoặc xem lại giỏ hàng.");
                });
            }
            
            // Xử lý sự kiện submit form
            const checkoutFormElement = checkoutForm.querySelector('#checkout-form');
            if (checkoutFormElement) {
                checkoutFormElement.addEventListener('submit', function(event) {
                    event.preventDefault();
                    
                    // Validate form
                    if (validateCheckoutForm()) {
                        processPayment({
                            totalAmount,
                            itemCount,
                            city: document.getElementById('customer-city').value,
                            district: document.getElementById('customer-district').value,
                            note: document.getElementById('customer-note').value,
                            email: document.getElementById('customer-email').value
                        });
                    }
                });
            }
        })
        .catch(error => {
            hideTypingIndicator();
            console.error('Error fetching cart for checkout:', error);
            addBotMessage("Xin lỗi, có lỗi xảy ra khi chuẩn bị thanh toán. Vui lòng thử lại sau.");
        });
}

// Hàm validate form thanh toán
function validateCheckoutForm() {
    let isValid = true;
    
    // Kiểm tra tên
    const customerName = document.getElementById('customer-name');
    const nameError = document.getElementById('name-error');
    if (!customerName.value.trim()) {
        nameError.textContent = 'Vui lòng nhập họ và tên';
        customerName.classList.add('error');
        isValid = false;
    } else if (customerName.value.trim().length < 3) {
        nameError.textContent = 'Tên phải có ít nhất 3 ký tự';
        customerName.classList.add('error');
        isValid = false;
    } else {
        nameError.textContent = '';
        customerName.classList.remove('error');
    }
    
    // Kiểm tra số điện thoại
    const customerPhone = document.getElementById('customer-phone');
    const phoneError = document.getElementById('phone-error');
    const phonePattern = /^(0|\+84)(\d{9,10})$/; // Vietnamese phone format
    
    if (!customerPhone.value.trim()) {
        phoneError.textContent = 'Vui lòng nhập số điện thoại';
        customerPhone.classList.add('error');
        isValid = false;
    } else if (!phonePattern.test(customerPhone.value.trim())) {
        phoneError.textContent = 'Số điện thoại không hợp lệ';
        customerPhone.classList.add('error');
        isValid = false;
    } else {
        phoneError.textContent = '';
        customerPhone.classList.remove('error');
    }
    
    // Kiểm tra địa chỉ
    const customerAddress = document.getElementById('customer-address');
    const addressError = document.getElementById('address-error');
    
    if (!customerAddress.value.trim()) {
        addressError.textContent = 'Vui lòng nhập địa chỉ nhận hàng';
        customerAddress.classList.add('error');
        isValid = false;
    } else if (customerAddress.value.trim().length < 10) {
        addressError.textContent = 'Địa chỉ quá ngắn, vui lòng nhập chi tiết hơn';
        customerAddress.classList.add('error');
        isValid = false;
    } else {
        addressError.textContent = '';
        customerAddress.classList.remove('error');
    }
    
    // Kiểm tra tỉnh/thành phố
    const citySelect = document.getElementById('customer-city');
    if (!citySelect.value) {
        citySelect.classList.add('error');
        isValid = false;
    } else {
        citySelect.classList.remove('error');
    }
    
    // Kiểm tra quận/huyện nếu tỉnh/thành phố đã được chọn
    const districtSelect = document.getElementById('customer-district');
    if (citySelect.value && !districtSelect.value) {
        districtSelect.classList.add('error');
        isValid = false;
    } else {
        districtSelect.classList.remove('error');
    }
    
    return isValid;
}

// Hàm xử lý thanh toán
function processPayment(additionalData) {
    // Lấy thông tin từ form
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerAddress = document.getElementById('customer-address').value;
    const customerCity = additionalData.city;
    const customerDistrict = additionalData.district;
    const customerEmail = additionalData.email || '';
    const customerNote = additionalData.note || '';
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    
    // Hiển thị loading khi xử lý
    const checkoutForm = document.querySelector('.checkout-form');
    if (checkoutForm) {
        checkoutForm.remove();
    }
    
    addBotMessage("Đang xử lý đơn hàng của bạn...");
    showTypingIndicator();
    
    // Chuẩn bị địa chỉ đầy đủ
    const fullAddress = `${customerAddress}, ${customerDistrict}, ${getFullCityName(customerCity)}`;
    
    // Gửi thông tin đơn hàng đến server
    fetch('/api/chatbot/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId,
            customerInfo: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                address: fullAddress,
                note: customerNote
            },
            paymentMethod
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || 'Error processing checkout');
            });
        }
        return response.json();
    })
    .then(data => {
        hideTypingIndicator();
        
        if (data.success) {
            // Format đơn hàng
            const orderId = data.orderId;
            const orderDate = new Date().toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const estimatedDelivery = new Date();
            estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);
            const deliveryDate = estimatedDelivery.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Hiển thị màn hình xác nhận đặt hàng thành công
            const confirmationScreen = document.createElement('div');
            confirmationScreen.classList.add('message', 'bot-message', 'order-confirmation');
            
            // Chuẩn bị hướng dẫn thanh toán nếu cần
            let paymentInstructions = '';
            let paymentStatus = 'Chưa thanh toán';
            let paymentStatusClass = 'payment-pending';
            
            if (paymentMethod === 'cod') {
                paymentStatus = 'Thanh toán khi nhận hàng';
                paymentStatusClass = 'payment-cod';
            }
            
            if (paymentMethod === 'bank-transfer') {
                paymentInstructions = `
                    <div class="payment-instructions">
                        <h4>Hướng dẫn thanh toán chuyển khoản</h4>
                        <div class="bank-details">
                            <div class="bank-detail-row">
                                <div class="bank-detail-label">Ngân hàng:</div>
                                <div class="bank-detail-value">Vietcombank</div>
                            </div>
                            <div class="bank-detail-row">
                                <div class="bank-detail-label">Chủ tài khoản:</div>
                                <div class="bank-detail-value">CÔNG TY TNHH FASHION STORE</div>
                            </div>
                            <div class="bank-detail-row">
                                <div class="bank-detail-label">Số tài khoản:</div>
                                <div class="bank-detail-value highlight">1234567890</div>
                            </div>
                            <div class="bank-detail-row">
                                <div class="bank-detail-label">Chi nhánh:</div>
                                <div class="bank-detail-value">Hà Nội</div>
                            </div>
                            <div class="bank-detail-row">
                                <div class="bank-detail-label">Nội dung CK:</div>
                                <div class="bank-detail-value highlight">FS${orderId}</div>
                            </div>
                        </div>
                        <div class="payment-note">
                            <i class="fas fa-info-circle"></i>
                            Vui lòng chuyển khoản trong vòng 24 giờ để đơn hàng được xử lý nhanh chóng
                        </div>
                    </div>
                `;
            } else if (paymentMethod === 'momo') {
                paymentInstructions = `
                    <div class="payment-instructions">
                        <h4>Hướng dẫn thanh toán qua MoMo</h4>
                        <div class="momo-qr">
                            <img src="https://via.placeholder.com/150x150?text=QR+Code" alt="MoMo QR Code">
                        </div>
                        <div class="momo-details">
                            <div class="momo-detail-row">
                                <div class="momo-detail-label">Số điện thoại:</div>
                                <div class="momo-detail-value highlight">0987654321</div>
                            </div>
                            <div class="momo-detail-row">
                                <div class="momo-detail-label">Chủ tài khoản:</div>
                                <div class="momo-detail-value">FASHION STORE</div>
                            </div>
                            <div class="momo-detail-row">
                                <div class="momo-detail-label">Số tiền:</div>
                                <div class="momo-detail-value highlight">${additionalData.totalAmount.toLocaleString('vi-VN')}đ</div>
                            </div>
                            <div class="momo-detail-row">
                                <div class="momo-detail-label">Nội dung:</div>
                                <div class="momo-detail-value highlight">FS${orderId}</div>
                            </div>
                        </div>
                        <div class="payment-note">
                            <i class="fas fa-info-circle"></i>
                            Vui lòng thanh toán trong vòng 15 phút để đơn hàng được xử lý ngay
                        </div>
                    </div>
                `;
            }
            
            confirmationScreen.innerHTML = `
                <div class="confirmation-container">
                    <div class="confirmation-header">
                        <div class="confirmation-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="confirmation-title">
                            <h3>Đặt hàng thành công!</h3>
                            <p>Cảm ơn bạn đã mua sắm tại Fashion Store</p>
                        </div>
                    </div>
                    
                    <div class="order-details">
                        <div class="order-id">
                            <span>Mã đơn hàng:</span>
                            <strong>#${orderId}</strong>
                        </div>
                        
                        <div class="order-info">
                            <div class="order-info-item">
                                <div class="order-info-label">Ngày đặt hàng:</div>
                                <div class="order-info-value">${orderDate}</div>
                            </div>
                            <div class="order-info-item">
                                <div class="order-info-label">Dự kiến giao hàng:</div>
                                <div class="order-info-value">${deliveryDate}</div>
                            </div>
                            <div class="order-info-item">
                                <div class="order-info-label">Trạng thái thanh toán:</div>
                                <div class="order-info-value ${paymentStatusClass}">${paymentStatus}</div>
                            </div>
                        </div>
                        
                        <div class="shipping-info">
                            <h4>Thông tin giao hàng</h4>
                            <div class="shipping-details">
                                <div class="shipping-name"><strong>${customerName}</strong></div>
                                <div class="shipping-phone">${customerPhone}</div>
                                <div class="shipping-address">${fullAddress}</div>
                                ${customerEmail ? `<div class="shipping-email">${customerEmail}</div>` : ''}
                                ${customerNote ? `<div class="shipping-note">Ghi chú: ${customerNote}</div>` : ''}
                            </div>
                        </div>
                        
                        <div class="order-summary">
                            <h4>Tóm tắt đơn hàng</h4>
                            <div class="order-summary-details">
                                <div class="summary-row">
                                    <span>Số lượng sản phẩm:</span>
                                    <span>${additionalData.itemCount}</span>
                                </div>
                                <div class="summary-row">
                                    <span>Tổng tiền hàng:</span>
                                    <span>${additionalData.totalAmount.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div class="summary-row">
                                    <span>Phí vận chuyển:</span>
                                    <span>Miễn phí</span>
                                </div>
                                <div class="summary-row total">
                                    <span>Tổng thanh toán:</span>
                                    <span>${additionalData.totalAmount.toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>
                        
                        ${paymentInstructions}
                        
                        <div class="order-actions">
                            <button id="view-more-products-btn" class="action-button primary">
                                <i class="fas fa-shopping-bag"></i> Tiếp tục mua sắm
                            </button>
                            <button id="track-order-btn" class="action-button secondary">
                                <i class="fas fa-truck"></i> Theo dõi đơn hàng
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            chatMessages.appendChild(confirmationScreen);
            scrollToBottom();
            
            // Thêm sự kiện cho các nút
            const viewMoreBtn = document.getElementById('view-more-products-btn');
            if (viewMoreBtn) {
                viewMoreBtn.addEventListener('click', function() {
                    addBotMessage("Hãy khám phá thêm các sản phẩm của chúng tôi!");
                    getProductRecommendations({ limit: 5 });
                });
            }
            
            const trackOrderBtn = document.getElementById('track-order-btn');
            if (trackOrderBtn) {
                trackOrderBtn.addEventListener('click', function() {
                    addBotMessage(`Đơn hàng #${orderId} của bạn đang được xử lý. Chúng tôi sẽ thông báo khi đơn hàng được giao cho đơn vị vận chuyển.`);
                });
            }
            
            // Thêm thông báo
            setTimeout(() => {
                addBotMessage(`Đơn hàng #${orderId} đã được xác nhận. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để xác nhận giao hàng.`);
                
                // Reset giỏ hàng UI
                updateCartBadge(0);
            }, 1000);
        } else {
            addBotMessage(`Có lỗi xảy ra: ${data.message || 'Không thể hoàn tất đơn hàng. Vui lòng thử lại sau.'}`);
        }
    })
    .catch(error => {
        hideTypingIndicator();
        console.error('Error processing payment:', error);
        addBotMessage("Xin lỗi, có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại sau.");
    });
}

// Hàm lấy tên đầy đủ của thành phố từ mã
function getFullCityName(cityCode) {
    const cities = {
        'HN': 'Hà Nội',
        'HCM': 'TP. Hồ Chí Minh',
        'DN': 'Đà Nẵng',
        'HP': 'Hải Phòng',
        'CT': 'Cần Thơ'
    };
    
    return cities[cityCode] || cityCode;
}

// Hàm lấy tên phương thức thanh toán
function getPaymentMethodName(method) {
    const methods = {
        'cod': 'Thanh toán khi nhận hàng (COD)',
        'bank-transfer': 'Chuyển khoản ngân hàng',
        'momo': 'Ví điện tử MoMo'
    };
    
    return methods[method] || method;
}
