// Supabase configuration
const SUPABASE_URL = "https://georzuqfssefsmcunjnu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlb3J6dXFmc3NlZnNtY3Vuam51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMjA5MDcsImV4cCI6MjA1ODU5NjkwN30.qg3vPTBq1_vBGCL2c6QpE53J8HaLPj9TWSrDElRjHgo";

document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageElement = document.getElementById('message');
    
    // Check if already logged in
    checkAuthStatus();
    
    // Event listeners
    loginBtn.addEventListener('click', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    
    // Login handler
    async function handleLogin() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!validateForm(email, password)) return;
        
        showMessage('Signing in...', 'info');
        
        try {
            // Using the correct Supabase Auth endpoint for email/password login
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ 
                    email, 
                    password 
                })
            });
            
            console.log("Login response status:", response.status);
            const data = await response.json();
            console.log("Login response data:", data);
            
            if (!response.ok) {
                throw new Error(data.error_description || data.error || 'Invalid email or password');
            }
            
            // Store auth info in Chrome storage
            const authSession = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                user: data.user,
                loggedInAt: new Date().toISOString()
            };
            
            chrome.storage.local.set({ authSession }, () => {
                showMessage('Successfully signed in!', 'success');
                setTimeout(() => {
                    // Redirect to popup
                    window.location.href = 'popup.html';
                }, 1000);
            });
            
        } catch (error) {
            console.error("Login error:", error);
            showMessage(error.message, 'error');
        }
    }
    
    // Signup handler
    async function handleSignup() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!validateForm(email, password)) return;
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        showMessage('Creating account...', 'info');
        
        try {
            // Using the correct Supabase Auth endpoint for signup
            const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            console.log("Signup response:", data);
            
            if (!response.ok) {
                throw new Error(data.error_description || data.message || 'Failed to create account');
            }
            
            // Check for email confirmation requirement
            if (data.id) {
                // Auto-login if email confirmation is not required
                showMessage('Account created! You can now sign in', 'success');
                passwordInput.value = ''; // Clear password for security
            } else {
                showMessage('Please check your email for confirmation link', 'success');
            }
            
        } catch (error) {
            console.error("Signup error:", error);
            showMessage(error.message, 'error');
        }
    }
    
    // Form validation
    function validateForm(email, password) {
        if (!email || !password) {
            showMessage('Please fill in all fields', 'error');
            return false;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email', 'error');
            return false;
        }
        
        return true;
    }
    
    // Email validation helper
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Message display helper
    function showMessage(text, type = 'info') {
        messageElement.textContent = text;
        messageElement.classList.remove('hidden', 'error', 'success');
        
        if (type === 'error') {
            messageElement.classList.add('error');
        } else if (type === 'success') {
            messageElement.classList.add('success');
        }
    }
    
    // Check if user is already logged in
    function checkAuthStatus() {
        chrome.storage.local.get(['authSession'], (result) => {
            if (result.authSession) {
                // Check if token is still valid (by date - simple check)
                const loggedInAt = new Date(result.authSession.loggedInAt);
                const now = new Date();
                const hoursSinceLogin = (now - loggedInAt) / (1000 * 60 * 60);
                
                // If logged in within the past 24 hours, redirect to popup
                if (hoursSinceLogin < 24) {
                    window.location.href = 'popup.html';
                    return;
                }
                
                // Otherwise, clear the session
                chrome.storage.local.remove(['authSession']);
            }
        });
    }
});