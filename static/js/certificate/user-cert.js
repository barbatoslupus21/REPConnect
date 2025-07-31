class EmployeeCertificateManager {
    constructor() {
        this.currentCertificateId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showCongratulationsModal();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-certificate')) {
                this.viewCertificate(e.target.dataset.certificateId);
            }
            
            if (e.target.classList.contains('email-certificate')) {
                this.emailCertificate(e.target.dataset.certificateId);
            }
        });

        const emailFromModal = document.getElementById('emailFromModal');
        if (emailFromModal) {
            emailFromModal.addEventListener('click', () => {
                if (this.currentCertificateId) {
                    this.emailCertificate(this.currentCertificateId);
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
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
        const loadingBtn = document.querySelector(`[data-certificate-id="${certificateId}"].email-certificate`);
        const originalContent = loadingBtn ? loadingBtn.innerHTML : '';
        
        if (loadingBtn) {
            loadingBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
            loadingBtn.disabled = true;
        }

        this.showLoading();

        try {
            const response = await fetch(`/certificates/email/${certificateId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification(data.message, 'success');
                
                if (loadingBtn) {
                    loadingBtn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                    setTimeout(() => {
                        loadingBtn.innerHTML = originalContent;
                    }, 2000);
                }
            } else {
                this.showNotification(data.error, 'error');
                if (loadingBtn) {
                    loadingBtn.innerHTML = originalContent;
                }
            }
        } catch (error) {
            this.showNotification('Network error occurred', 'error');
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