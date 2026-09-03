/* =====================================================
   STORYNEST - AUTHENTICATION
   ===================================================== */

const AUTH_STORAGE_KEY = 'sb-frtvsuxvhvnjrrffyeot-auth-token';

/* =====================================================
   HELPERS
   ===================================================== */

async function getCurrentSession() {
    // Check localStorage first
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
        try {
            const session = JSON.parse(stored);
            if (session && session.user) {
                return session;
            }
        } catch (e) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }
    
    // Fallback to Supabase
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.session));
        return data.session;
    }
    return null;
}

function redirectToLogin(destination) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const redirect = destination || currentPage;
    window.location.replace(`login.html?redirect=${encodeURIComponent(redirect)}`);
}

function redirectAfterAuth(destination) {
    window.location.replace(destination || 'author.html');
}

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    container.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* =====================================================
   ELEMENTS
   ===================================================== */

const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const authMessage = document.getElementById('authMessage');

/* =====================================================
   MESSAGE
   ===================================================== */

function showMessage(message, error = false) {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.style.color = error ? '#ff6b6b' : '#58d68d';
}

/* =====================================================
   SIGN UP
   ===================================================== */

if (signupForm) {
    signupForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const displayName = document.getElementById('displayName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        
        if (!displayName || !email || !password) {
            showMessage('Please complete all fields.', true);
            return;
        }
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters.', true);
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        showMessage('Creating account...');
        
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: displayName
                    }
                }
            });
            
            if (error) {
                console.error('SIGNUP ERROR:', error);
                showMessage(error.message, true);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
                return;
            }
            
            // Session created immediately
            if (data && data.session && data.user) {
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.session));
                showMessage('Account created! Opening Author Studio...');
                await new Promise(resolve => setTimeout(resolve, 300));
                window.location.replace('author.html');
                return;
            }
            
            // Email confirmation required
            showMessage('Account created! Please check your email to confirm your account.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
            
        } catch (error) {
            console.error('SIGNUP ERROR:', error);
            showMessage('An unexpected error occurred.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    });
}

/* =====================================================
   LOGIN
   ===================================================== */

if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        if (!email || !password) {
            showMessage('Please enter your email and password.', true);
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        showMessage('Logging in...');
        
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('LOGIN ERROR:', error);
                showMessage(error.message, true);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
                return;
            }
            
            if (!data || !data.session || !data.user) {
                console.error('LOGIN SESSION MISSING:', data);
                showMessage('Login succeeded, but no session was created.', true);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
                return;
            }
            
            // Store session
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.session));
            console.log('LOGIN SUCCESS:', data.user.email);
            
            // Get redirect destination
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            
            let destination = 'author.html';
            if (redirect && !redirect.includes('://') && !redirect.startsWith('//')) {
                destination = redirect;
            }
            
            showMessage('Login successful! Redirecting...');
            
            // Small delay for storage persistence
            setTimeout(() => {
                window.location.replace(destination);
            }, 300);
            
        } catch (error) {
            console.error('LOGIN ERROR:', error);
            showMessage('An unexpected error occurred.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
}