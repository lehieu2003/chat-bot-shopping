// Tạo ID người dùng ngẫu nhiên hoặc lấy từ localStorage
let userId = localStorage.getItem('fashionbot_userId') || generateUserId();
localStorage.setItem('fashionbot_userId', userId);

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const productList = document.getElementById('product-list');

// Khởi tạo chatbot khi tải trang
document.addEventListener('DOMContentLoaded', function () {
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

    // Chat functionality
    const messageInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const productList = document.getElementById('product-list');
    
    // Initialize chat with welcome message if there's no chat history
    if (chatMessages.children.length === 0) {
        addBotMessage("Xin chào! Tôi là Fashion Advisor, trợ lý thời trang thông minh. Tôi có thể giúp bạn tìm kiếm trang phục, phối đồ, và tư vấn phong cách phù hợp với bạn.");
    }

    // Handle sending messages
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = messageInput.value.trim();
        if (message === '') return;

        // Clear input
        messageInput.value = '';

        // Add user message to chat
        addUserMessage(message);

        // Show typing indicator
        showTypingIndicator();

        try {
            const token = localStorage.getItem('token');
            
            // Send message to server with authentication token
            const response = await fetch('/api/chatbot/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ message }) // No need to send userId, the server will get it from token
            });

            // Hide typing indicator
            hideTypingIndicator();

            const data = await response.json();
            
            if (data.success) {
                // Add bot response to chat
                addBotMessage(data.response.message);
                
                // If there are product recommendations, update the sidebar
                if (data.response.products && data.response.products.length > 0) {
                    updateProductSuggestions(data.response.products);
                }
                
                // If there are action buttons, add them
                if (data.response.actions && data.response.actions.length > 0) {
                    addActionButtons(data.response.actions);
                }
            } else {
                addBotMessage("Xin lỗi, tôi đang gặp một chút sự cố. Vui lòng thử lại sau.");
            }
        } catch (error) {
            console.error('Error sending message:', error);
            hideTypingIndicator();
            addBotMessage("Xin lỗi, có lỗi xảy ra khi kết nối với server. Vui lòng thử lại sau.");
        }
    }

    function addUserMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'user-message');
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
            </div>
        `;
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    function addBotMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'bot-message');
        messageElement.innerHTML = `
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>${text}</p>
            </div>
        `;
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typing-indicator';
        typingIndicator.classList.add('message', 'bot-message');
        typingIndicator.innerHTML = `
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function updateProductSuggestions(products) {
        productList.innerHTML = '';
        products.forEach(product => {
            const productElement = document.createElement('div');
            productElement.classList.add('product-card');
            productElement.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.name}">
                <h4>${product.name}</h4>
                <p class="price">${product.price.toLocaleString('vi-VN')}đ</p>
                <button class="view-product" data-id="${product._id}">
                    <i class="fas fa-eye"></i> Chi tiết
                </button>
            `;
            productList.appendChild(productElement);
        });

        // Add event listeners to product buttons
        document.querySelectorAll('.view-product').forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                viewProductDetails(productId);
            });
        });
    }

    function addActionButtons(actions) {
        // Get the last message (which should be from the bot)
        const lastMessage = chatMessages.lastElementChild;
        
        if (lastMessage && lastMessage.classList.contains('bot-message')) {
            const actionContainer = document.createElement('div');
            actionContainer.classList.add('action-buttons');
            
            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('button-container');
            
            actions.forEach(action => {
                const button = document.createElement('button');
                button.classList.add('action-btn');
                button.classList.add(action.type + '-btn');
                button.textContent = action.text;
                button.addEventListener('click', () => {
                    if (action.type === 'view-cart') {
                        window.location.href = '/cart.html';
                    } else if (action.type === 'continue-shopping') {
                        // Do nothing, just let the user continue chatting
                    } else if (action.action === 'addToCart') {
                        addToCart(action.productId);
                    }
                });
                buttonContainer.appendChild(button);
            });
            
            actionContainer.appendChild(buttonContainer);
            lastMessage.querySelector('.message-content').appendChild(actionContainer);
        }
    }

    async function viewProductDetails(productId) {
        try {
            const response = await fetch(`/api/chatbot/product/${productId}`, {
                headers: {
                    'x-auth-token': token
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Add product details to the chat
                const product = data.product;
                addBotMessage(`<strong>${product.name}</strong><br>
                    <img src="${product.imageUrl}" alt="${product.name}" style="max-width: 200px; margin: 10px 0;"><br>
                    <strong>Giá:</strong> ${product.price.toLocaleString('vi-VN')}đ<br>
                    <strong>Mô tả:</strong> ${product.description}<br>
                    <strong>Kích cỡ:</strong> ${product.sizes.join(', ')}<br>
                    <strong>Màu sắc:</strong> ${product.colors.join(', ')}`);
                
                // Add action buttons
                addActionButtons([
                    {
                        type: 'add-to-cart',
                        text: 'Thêm vào giỏ hàng',
                        action: 'addToCart',
                        productId: product._id
                    }
                ]);
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
        }
    }

    async function addToCart(productId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chatbot/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    productId,
                    quantity: 1
                }) // No need to send userId, will extract from token
            });
            
            const data = await response.json();
            
            if (data.success) {
                addBotMessage(`Đã thêm sản phẩm vào giỏ hàng! Hiện có ${data.cartCount} sản phẩm trong giỏ.`);
                
                // Add action buttons
                addActionButtons([
                    {
                        type: 'view-cart',
                        text: 'Xem giỏ hàng'
                    },
                    {
                        type: 'continue-shopping',
                        text: 'Tiếp tục mua sắm'
                    }
                ]);
            } else {
                addBotMessage("Xin lỗi, có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng.");
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            addBotMessage("Xin lỗi, có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng.");
        }
    }
});

// Hàm tạo ID người dùng ngẫu nhiên
function generateUserId() {
    return 'user_' + Math.random().toString(36).substring(2, 15);
}
