// Auth related functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.querySelector('.error-message');
    const successMessage = document.querySelector('.success-message');
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Hide any previous messages
            if (errorMessage) errorMessage.style.display = 'none';
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            
            console.log('Attempting login with email:', email); // Debug log
            
            // Basic validation
            if (!email || !password) {
                if (errorMessage) {
                    errorMessage.textContent = 'Please enter both email and password';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            try {
                console.log('Sending login request...'); // Debug log
                
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                });
                
                console.log('Login response status:', response.status); // Debug log
                
                const data = await response.json();
                console.log('Login response data:', data); // Debug log
                
                if (response.ok) {
                    // Save auth data to localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userId', data.user.userId);
                    localStorage.setItem('username', data.user.username);
                    
                    console.log('Login successful, redirecting...'); // Debug log
                    
                    // Redirect to main page
                    window.location.href = '/';
                } else {
                    // Show error message
                    if (errorMessage) {
                        errorMessage.textContent = data.message || 'Login failed. Please check your credentials.';
                        errorMessage.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error during login:', error);
                if (errorMessage) {
                    errorMessage.textContent = 'An error occurred. Please try again later.';
                    errorMessage.style.display = 'block';
                }
            }
        });
    }
    
    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Hide any previous messages
            if (errorMessage) errorMessage.style.display = 'none';
            if (successMessage) successMessage.style.display = 'none';
            
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const confirmPassword = document.getElementById('confirmPassword').value.trim();
            
            // Basic validation
            if (!username || !email || !password) {
                if (errorMessage) {
                    errorMessage.textContent = 'Please fill in all fields';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            if (password !== confirmPassword) {
                if (errorMessage) {
                    errorMessage.textContent = 'Passwords do not match';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        password
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Show success message
                    if (successMessage) {
                        successMessage.textContent = 'Registration successful! You can now log in.';
                        successMessage.style.display = 'block';
                    }
                    
                    // Clear form
                    registerForm.reset();
                    
                    // Redirect to login page after a short delay
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                } else {
                    // Show error message
                    if (errorMessage) {
                        errorMessage.textContent = data.message || 'Registration failed. Please try again.';
                        errorMessage.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error during registration:', error);
                if (errorMessage) {
                    errorMessage.textContent = 'An error occurred. Please try again later.';
                    errorMessage.style.display = 'block';
                }
            }
        });
    }
});
