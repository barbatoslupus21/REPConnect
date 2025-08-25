class EmployeeCertificateManager {
    constructor() {
        this.currentCertificateId = null;
        this.currentCertificateTitle = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showCongratulationsModal();
    }

    getCsrfToken() {
        // Try to get from cookie first (Django default)
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        
        if (cookieValue) {
            return cookieValue;
        }
        
        // Fallback to meta tag if available
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        
        // Last fallback to hidden input
        const hiddenInput = document.querySelector('[name="csrfmiddlewaretoken"]');
        if (hiddenInput) {
            return hiddenInput.value;
        }
        
        console.error('CSRF token not found');
        return '';
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-certificate')) {
                this.viewCertificate(e.target.dataset.certificateId);
            }
            
            if (e.target.classList.contains('email-certificate')) {
                this.showEmailConfirmation(e.target.dataset.certificateId);
            }
            
            // Handle modal close buttons
            if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                this.closeEmailConfirmationModal();
                this.closeCertificateViewModal();
                this.closeCongratulationsModal();
            }
            
            // Handle modal overlay clicks
            if (e.target.classList.contains('modal-overlay')) {
                this.closeEmailConfirmationModal();
                this.closeCertificateViewModal();
                this.closeCongratulationsModal();
            }
        });

        // Handle email confirmation
        const confirmSendBtn = document.getElementById('confirm-send-email');
        if (confirmSendBtn) {
            confirmSendBtn.addEventListener('click', () => {
                if (this.currentCertificateId) {
                    this.closeEmailConfirmationModal();
                    this.emailCertificate(this.currentCertificateId);
                }
            });
        }

        const emailFromModal = document.getElementById('emailFromModal');
        if (emailFromModal) {
            emailFromModal.addEventListener('click', () => {
                if (this.currentCertificateId) {
                    this.showEmailConfirmation(this.currentCertificateId);
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEmailConfirmationModal();
                this.closeCertificateViewModal();
                this.closeCongratulationsModal();
            }
        });
    }

    showCongratulationsModal() {
        const congratsModal = document.getElementById('congratsModal');
        if (congratsModal) {
            setTimeout(() => {
                congratsModal.classList.add('show');
                this.animateConfetti();
                this.markUnseenCertificatesAsSeen();
            }, 500);
        }
    }

    animateConfetti() {
        // Enhanced confetti animation with multiple effects
        this.triggerConfettiCannons();
        this.startFloatingConfetti();
        this.triggerConfettiBurst();
        this.startSparkleEffects();

        // Optional: Play celebration sound
        this.playCelebrationSound();
    }

    triggerConfettiCannons() {
        const leftCannon = document.querySelector('.left-cannon');
        const rightCannon = document.querySelector('.right-cannon');

        if (leftCannon && rightCannon) {
            // Trigger left cannon
            setTimeout(() => {
                leftCannon.classList.add('fire');
                this.animateCannonPieces(leftCannon, 'left');
            }, 300);

            // Trigger right cannon
            setTimeout(() => {
                rightCannon.classList.add('fire');
                this.animateCannonPieces(rightCannon, 'right');
            }, 500);

            // Second wave
            setTimeout(() => {
                leftCannon.classList.remove('fire');
                rightCannon.classList.remove('fire');
                setTimeout(() => {
                    leftCannon.classList.add('fire');
                    rightCannon.classList.add('fire');
                    this.animateCannonPieces(leftCannon, 'left');
                    this.animateCannonPieces(rightCannon, 'right');
                }, 100);
            }, 2000);
        }
    }

    animateCannonPieces(cannon, direction) {
        const pieces = cannon.querySelectorAll('.confetti-piece');
        pieces.forEach((piece, index) => {
            setTimeout(() => {
                piece.classList.add('launched');
                // Remove class after animation to allow re-triggering
                setTimeout(() => {
                    piece.classList.remove('launched');
                }, 3000);
            }, index * 50);
        });
    }

    startFloatingConfetti() {
        const floatingContainer = document.querySelector('.floating-confetti');
        if (floatingContainer) {
            floatingContainer.classList.add('active');

            // Keep floating for duration of modal
            setTimeout(() => {
                floatingContainer.classList.remove('active');
            }, 8000);
        }
    }

    triggerConfettiBurst() {
        const burstContainer = document.querySelector('.center-burst');
        if (burstContainer) {
            setTimeout(() => {
                burstContainer.classList.add('explode');

                // Reset after animation
                setTimeout(() => {
                    burstContainer.classList.remove('explode');
                }, 2000);
            }, 800);
        }
    }

    startSparkleEffects() {
        const sparkles = document.querySelectorAll('.sparkle');
        sparkles.forEach((sparkle, index) => {
            setTimeout(() => {
                sparkle.classList.add('twinkle');

                // Continuous twinkling
                setInterval(() => {
                    sparkle.classList.toggle('twinkle');
                }, 1500 + (index * 200));
            }, index * 300);
        });
    }

    playCelebrationSound() {
        // Optional: Add celebration sound effect
        try {
            // You can add an audio element or use Web Audio API
            // const audio = new Audio('/static/sounds/celebration.mp3');
            // audio.volume = 0.3;
            // audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {
            console.log('Audio not available');
        }
    }

    async markUnseenCertificatesAsSeen() {
        const unseenCertificates = document.querySelectorAll('.certificate-card .badge-new');
        
        for (let badge of unseenCertificates) {
            const certificateCard = badge.closest('.certificate-card');
            const certificateId = certificateCard.dataset.certificateId;
            
            try {
                await fetch(`/certificates/mark-seen/${certificateId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                        'Content-Type': 'application/json'
                    }
                });
                
                setTimeout(() => {
                    badge.style.animation = 'fadeOut 0.5s ease-out';
                    setTimeout(() => {
                        if (badge.parentNode) {
                            badge.remove();
                        }
                    }, 500);
                }, 2000);
                
            } catch (error) {
                console.error('Failed to mark certificate as seen:', error);
            }
        }
    }

    async viewCertificate(certificateId) {
        this.currentCertificateId = certificateId;
        const modal = document.getElementById('certificateViewModal');
        const content = document.getElementById('certificateViewContent');
        const title = document.getElementById('certificateViewTitle');
        
        content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading certificate...</p></div>';
        modal.classList.add('show');

        try {
            // Fetch certificate details to determine file type
            const certResponse = await fetch(`/certificate/get-certificate-details/${certificateId}/`);
            const certData = await certResponse.json();
            
            if (!certData.success) {
                throw new Error('Failed to get certificate details');
            }
            
            title.textContent = certData.certificate.title || 'Certificate Preview';
            
            if (certData.certificate.is_image) {
                // For images, use img tag with CSS styling
                content.innerHTML = `
                    <img src="${certData.certificate.file_url}" 
                         alt="${certData.certificate.title || 'Certificate'}" 
                         class="certificate-preview-image">
                `;
            } else {
                // For PDFs and other files, use iframe
                const viewUrl = `/certificate/view/${certificateId}/`;
                content.innerHTML = `
                    <iframe src="${viewUrl}" width="100%" height="70vh" frameborder="0" style="border-radius: var(--radius-md);">
                        <p>Unable to load certificate. <a href="${viewUrl}" target="_blank" class="btn btn-primary">Open in new tab</a></p>
                    </iframe>
                `;
            }

            await this.markCertificateAsSeen(certificateId);
            
        } catch (error) {
            content.innerHTML = '<p class="error">Failed to load certificate</p>';
        }
    }

    async markCertificateAsSeen(certificateId) {
        try {
            await fetch(`/certificates/mark-seen/${certificateId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json'
                }
            });
            
            const certificateCard = document.querySelector(`[data-certificate-id="${certificateId}"]`);
            const badge = certificateCard?.querySelector('.badge-new');
            
            if (badge) {
                badge.style.animation = 'fadeOut 0.5s ease-out';
                setTimeout(() => {
                    if (badge.parentNode) {
                        badge.remove();
                    }
                }, 500);
            }
            
        } catch (error) {
            console.error('Failed to mark certificate as seen:', error);
        }
    }

    async emailCertificate(certificateId) {
        console.log('Starting email certificate process for ID:', certificateId);
        
        const loadingBtn = document.querySelector(`[data-certificate-id="${certificateId}"].email-certificate`);
        const originalContent = loadingBtn ? loadingBtn.innerHTML : '';
        
        if (loadingBtn) {
            loadingBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
            loadingBtn.disabled = true;
        }

        this.showLoading();

        try {
            const csrfToken = this.getCsrfToken();
            if (!csrfToken) {
                throw new Error('CSRF token not found. Please refresh the page and try again.');
            }

            console.log('Making request to:', `/certificate/email/${certificateId}/`);
            console.log('CSRF token found:', csrfToken ? 'Yes' : 'No');

            // Create a controller for timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(`/certificate/email/${certificateId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
                let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
                if (response.status === 404) {
                    errorMessage = 'Certificate not found or email endpoint unavailable.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. Please refresh the page and try again.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error occurred. Please try again later.';
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (data.success) {
                console.log('Email sent successfully');
                this.showNotification(data.message, 'success');
                
                if (loadingBtn) {
                    loadingBtn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                    setTimeout(() => {
                        loadingBtn.innerHTML = originalContent;
                    }, 2000);
                }
            } else {
                console.log('Email sending failed:', data.error);
                this.showNotification(data.error, 'error');
                if (loadingBtn) {
                    loadingBtn.innerHTML = originalContent;
                }
            }
        } catch (error) {
            console.error('Email certificate error:', error);
            
            let errorMessage = 'Network error occurred';
            
            // Provide more specific error messages based on error type
            if (error instanceof TypeError && error.message.includes('fetch')) {
                errorMessage = 'Network connection failed. Please check your internet connection.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Request was cancelled. Please try again.';
            } else if (error.message) {
                errorMessage = `Network error: ${error.message}`;
            }
            
            this.showNotification(errorMessage, 'error');
            
            if (loadingBtn) {
                loadingBtn.innerHTML = originalContent;
            }
        } finally {
            this.hideLoading();
            if (loadingBtn) {
                loadingBtn.disabled = false;
            }
        }
    }

    showEmailConfirmation(certificateId) {
        // Get certificate title from the card
        const certificateCard = document.querySelector(`[data-certificate-id="${certificateId}"]`);
        const certificateTitle = certificateCard ? 
            certificateCard.querySelector('.card-header h4').textContent : 
            'Certificate';
        
        this.currentCertificateId = certificateId;
        this.currentCertificateTitle = certificateTitle;
        
        // Update modal content
        const titleElement = document.getElementById('confirm-cert-title');
        if (titleElement) {
            titleElement.textContent = certificateTitle;
        }
        
        // Show modal
        const modal = document.getElementById('emailConfirmationModal');
        if (modal) {
            modal.style.display = 'flex';
            // Add slight delay for smooth animation
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }

    closeEmailConfirmationModal() {
        const modal = document.getElementById('emailConfirmationModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // Match CSS transition duration
        }
    }

    closeCongratulationsModal() {
        const modal = document.getElementById('congratsModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    closeCertificateViewModal() {
        const modal = document.getElementById('certificateViewModal');
        if (modal) {
            modal.classList.remove('show');
            this.currentCertificateId = null;
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        else if (type === 'error') icon = 'exclamation-circle';
        else if (type === 'warning') icon = 'exclamation-triangle';
        
        let bgColor = 'var(--primary-color)';
        if (type === 'success') bgColor = 'var(--success-color)';
        else if (type === 'error') bgColor = 'var(--error-color)';
        else if (type === 'warning') bgColor = 'var(--warning-color)';
        
        toast.style.cssText = `
            background: ${bgColor};
            color: white;
            border: none;
            border-radius: var(--radius-md);
            padding: var(--space-md);
            margin-bottom: var(--space-sm);
            box-shadow: var(--shadow-lg);
            animation: slideInRight 0.3s ease-out;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; color: white;">
                <i class="fas fa-${icon}" style="font-size: 1.1rem; opacity: 0.9; color: white;"></i>
                <span style="flex: 1; color: white;">${message}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 4000);
    }
}

function closeCongratulationsModal() {
    if (window.employeeCertificateManager) {
        window.employeeCertificateManager.closeCongratulationsModal();
    }
}

function closeCertificateViewModal() {
    if (window.employeeCertificateManager) {
        window.employeeCertificateManager.closeCertificateViewModal();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.employeeCertificateManager = new EmployeeCertificateManager();
});