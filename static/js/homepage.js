document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const navbar = document.querySelector('.ryonan_navbar');
    const loginBtn = document.getElementById('loginBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const modalContainer = document.getElementById('modalContainer');
    const closeModal = document.getElementById('closeModal');
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const featureCards = document.querySelectorAll('.ryonan_feature_card');
    const ctaBtn = document.querySelector('.ryonan_cta_btn');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordField = document.getElementById('password');
    const eyeIcon = document.querySelector('.ryonan_eye_icon');
    const eyeOffIcon = document.querySelector('.ryonan_eye_off_icon');
    const slides = document.querySelectorAll('.ryonan_carousel_slide');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const registerBtn = document.getElementById('registerBtn');
    const registerModalContainer = document.getElementById('registerModalContainer');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    let current = 0;

    setupIntersectionObserver();
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    document.querySelectorAll('.ryonan_nav_link, .ryonan_mobile_nav_link').forEach(link => {
        link.addEventListener('click', smoothScroll);
    });

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }
    
    if (ctaBtn) {
        ctaBtn.addEventListener('mouseenter', function() {
            const btnSvg = this.querySelector('svg');
            gsapButtonAnimation(btnSvg);
        });
        
        ctaBtn.addEventListener('click', function() {
            openModal();
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', openModal);
    }
    
    if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
            openModal();
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunction);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (passwordToggle && passwordField) {
        passwordToggle.addEventListener('click', function() {
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                eyeIcon.style.display = 'none';
                eyeOffIcon.style.display = 'block';
            } else {
                passwordField.type = 'password';
                eyeIcon.style.display = 'block';
                eyeOffIcon.style.display = 'none';
            }
        });
    }

    // Register Modal Open
    if (registerBtn && registerModalContainer) {
        registerBtn.addEventListener('click', function() {
            if (modalContainer) modalContainer.classList.remove('active');
            registerModalContainer.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    // Register Modal Close
    if (closeRegisterModal && registerModalContainer) {
        closeRegisterModal.addEventListener('click', function() {
            registerModalContainer.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }

    // Register Modal Password Toggle
    const registerPassword = document.getElementById('register_password');
    const registerPasswordToggle = document.getElementById('registerPasswordToggle');
    const registerConfirmPassword = document.getElementById('register_confirm_password');
    const registerConfirmPasswordToggle = document.getElementById('registerConfirmPasswordToggle');
    if (registerPassword && registerPasswordToggle) {
        const eye = registerPasswordToggle.querySelector('.ryonan_eye_icon');
        const eyeOff = registerPasswordToggle.querySelector('.ryonan_eye_off_icon');
        registerPasswordToggle.addEventListener('click', function() {
            if (registerPassword.type === 'password') {
                registerPassword.type = 'text';
                eye.style.display = 'none';
                eyeOff.style.display = 'block';
            } else {
                registerPassword.type = 'password';
                eye.style.display = 'block';
                eyeOff.style.display = 'none';
            }
        });
    }
    if (registerConfirmPassword && registerConfirmPasswordToggle) {
        const eye = registerConfirmPasswordToggle.querySelector('.ryonan_eye_icon');
        const eyeOff = registerConfirmPasswordToggle.querySelector('.ryonan_eye_off_icon');
        registerConfirmPasswordToggle.addEventListener('click', function() {
            if (registerConfirmPassword.type === 'password') {
                registerConfirmPassword.type = 'text';
                eye.style.display = 'none';
                eyeOff.style.display = 'block';
            } else {
                registerConfirmPassword.type = 'password';
                eye.style.display = 'block';
                eyeOff.style.display = 'none';
            }
        });
    }

    // Register Form Custom Validation
    const registerForm = document.getElementById('registerForm');
    const registerErrorMessage = document.getElementById('registerErrorMessage');
    if (registerForm && registerErrorMessage) {
        registerForm.addEventListener('submit', function(e) {
            let error = '';
            let errorList = [];
            const requiredFields = [
                'register_first_name',
                'register_last_name',
                'register_idnumber',
                'register_email',
                'register_username',
                'register_password',
                'register_confirm_password'
            ];
            for (let id of requiredFields) {
                const field = document.getElementById(id);
                if (field && !field.value.trim()) {
                    error = 'Please fill out all required fields.';
                    break;
                }
            }
            const pw = document.getElementById('register_password').value;
            const cpw = document.getElementById('register_confirm_password').value;
            if (!error) {
                // Password requirements
                if (pw.length < 6) errorList.push('At least 6 characters');
                if (!/[A-Z]/.test(pw)) errorList.push('At least one uppercase letter');
                if (!/[a-z]/.test(pw)) errorList.push('At least one lowercase letter');
                if (!/[0-9]/.test(pw)) errorList.push('At least one number');
                if (!/[^A-Za-z0-9]/.test(pw)) errorList.push('At least one special character');
                if (errorList.length > 0) {
                    error = '';
                } else if (pw !== cpw) {
                    error = 'Passwords do not match.';
                }
            }
            if (error || errorList.length > 0) {
                e.preventDefault();
                let html = '';
                if (error) html += error;
                if (errorList.length > 0) {
                    html += '<ul style="margin:0;padding-left:1.2em;text-align:left;">';
                    for (let err of errorList) html += `<li>${err}</li>`;
                    html += '</ul>';
                }
                registerErrorMessage.innerHTML = html;
                registerErrorMessage.classList.remove('show');
                void registerErrorMessage.offsetWidth;
                registerErrorMessage.classList.add('show');
            } else {
                registerErrorMessage.textContent = '';
                registerErrorMessage.classList.remove('show');
            }
        });
    }

    function gsapButtonAnimation(element) {
        if (!element) return;
        
        element.style.transition = 'transform 0.3s ease';
        element.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
    }

    function setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const delay = card.dataset.delay || 0;
                    
                    setTimeout(() => {
                        card.classList.add('animate');
                    }, parseInt(delay));

                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.1 });

        featureCards.forEach(card => {
            observer.observe(card);
        });
    }

    function smoothScroll(e) {
        e.preventDefault();

        if (mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            const targetPosition = targetElement.offsetTop;
            
            window.scrollTo({
                top: targetPosition - 80,
                behavior: 'smooth'
            });
        }
    }
    
    function openModal() {
        if (modalContainer) {
            modalContainer.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeModalFunction() {
        if (modalContainer) {
            modalContainer.classList.remove('active');
            document.body.style.overflow = 'auto';
  
            if (errorMessage) {
                errorMessage.classList.remove('show');
            }
        }
    }
    
    function handleLogin(e) {
        submitBtn.classList.add('loading');
        submitBtn.querySelector('span').textContent = 'Logging in';
    }

    // Carousel logic only if elements exist
    if (slides.length && prevBtn && nextBtn) {
        function showSlide(idx) {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === idx);
            });
        }

        prevBtn.addEventListener('click', function() {
            current = (current - 1 + slides.length) % slides.length;
            showSlide(current);
        });

        nextBtn.addEventListener('click', function() {
            current = (current + 1) % slides.length;
            showSlide(current);
        });

        showSlide(current);
    }

    // Auto-capitalize first letter of each word for first and last name
    function capitalizeWords(str) {
        return str.replace(/\b\w+/g, function(word) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });
    }
    const firstNameInput = document.getElementById('register_first_name');
    const lastNameInput = document.getElementById('register_last_name');
    if (firstNameInput) {
        firstNameInput.addEventListener('input', function() {
            this.value = capitalizeWords(this.value);
        });
    }
    if (lastNameInput) {
        lastNameInput.addEventListener('input', function() {
            this.value = capitalizeWords(this.value);
        });
    }

    // Modal switch links
    const openRegisterModalLink = document.getElementById('openRegisterModal');
    const openLoginModalLink = document.getElementById('openLoginModal');
    if (openRegisterModalLink && registerModalContainer && modalContainer) {
        openRegisterModalLink.addEventListener('click', function(e) {
            e.preventDefault();
            modalContainer.classList.remove('active');
            registerModalContainer.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    if (openLoginModalLink && registerModalContainer && modalContainer) {
        openLoginModalLink.addEventListener('click', function(e) {
            e.preventDefault();
            registerModalContainer.classList.remove('active');
            modalContainer.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // Confirmation Modal Close
    const closeConfirmationModal = document.getElementById('closeConfirmationModal');
    const confirmationModalContainer = document.getElementById('confirmationModalContainer');
    if (closeConfirmationModal && confirmationModalContainer) {
        closeConfirmationModal.addEventListener('click', function() {
            confirmationModalContainer.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }
});