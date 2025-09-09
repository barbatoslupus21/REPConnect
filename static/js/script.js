class EmployeePortalUI {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.charts = {};
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.initializeCharts();
        this.setupAnimations();
        this.setupDropdowns();
        this.setupTabs();
        this.setupSearch();
        this.setupNotifications();
        this.setupTables();
        this.setupTimeline();
        this.setupForms();
        this.setupSidebar();
        this.setupNavigation();
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeToggle = document.getElementById('theme-toggle-checkbox');
        
        if (themeToggle) {
            themeToggle.checked = this.currentTheme === 'dark';
            themeToggle.addEventListener('change', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        const toggle = document.getElementById('theme-toggle-checkbox');
        
        this.createThemeWave();
        
        setTimeout(() => {
            this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', this.currentTheme);
            localStorage.setItem('theme', this.currentTheme);
            
            this.updateChartsForTheme();
        }, 300);
        
        toggle.style.transform = 'scale(0.8) rotate(360deg)';
        
        setTimeout(() => {
            toggle.style.transform = 'scale(1) rotate(0deg)';
        }, 600);
    }

    createThemeWave() {
        const existingWave = document.querySelector('.theme-wave');
        if (existingWave) {
            existingWave.remove();
        }

        const wave = document.createElement('div');
        wave.className = 'theme-wave';
        
        const toggleBtn = document.getElementById('theme-toggle-checkbox');
        const toggleRect = toggleBtn.getBoundingClientRect();
        
        const centerX = toggleRect.left + toggleRect.width / 2;
        const centerY = toggleRect.top + toggleRect.height / 2;
        
        wave.style.left = centerX + 'px';
        wave.style.top = centerY + 'px';
        wave.style.marginLeft = '-50vw';
        wave.style.marginTop = '-50vh';
        wave.style.width = '100vw';
        wave.style.height = '100vh';
        
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        if (newTheme === 'dark') {
            wave.style.background = '#0f172a';
        } else {
            wave.style.background = '#ffffff';
        }
        
        document.body.appendChild(wave);
        
        requestAnimationFrame(() => {
            wave.classList.add('animate');
        });
        
        setTimeout(() => {
            if (wave.parentNode) {
                wave.remove();
            }
        }, 800);
    }

    setupSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const mobileToggle = document.getElementById('mobile-toggle');
        const mainContent = document.querySelector('.main-content');
        const logo = document.querySelector('.logo-container');

        if (!this.isMobile()) {
            let savedState = this.getSidebarState();
            if (!localStorage.getItem('sidebar-state')) {
                savedState = 'minimized';
                this.saveSidebarState('minimized');
            }
            if (savedState === 'expanded') {
                sidebar.classList.remove('minimized');
                sidebar.classList.add('expanded');
                mainContent.style.marginLeft = 'var(--sidebar-width-expanded)';
            } else {
                sidebar.classList.remove('expanded');
                sidebar.classList.add('minimized');
                mainContent.style.marginLeft = 'var(--sidebar-width-minimized)';
            }
        } else {
            sidebar.classList.remove('minimized');
            sidebar.classList.add('mobile-hidden');
            mainContent.style.marginLeft = '0';
        }

        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                if (!this.isMobile()) {
                    this.toggleDesktopSidebar();
                }
            });
        }

        if (logo) {
            logo.addEventListener('click', () => {
                if (!this.isMobile() && sidebar.classList.contains('minimized')) {
                    this.toggleDesktopSidebar();
                }
            });
        }

        this.setupUserProfile();
        this.setActiveSidebarItem();
    this.setupIconTooltips();
        
        if (mainContent) {
            mainContent.addEventListener('click', () => {
                if (this.isMobile() && sidebar.classList.contains('mobile-visible')) {
                    this.closeMobileSidebar();
                }
            });
        }
    }

    setupIconTooltips() {
        // Tooltip for minimized sidebar icons. Shows on hover and focus, or on click for touch.
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        let tooltipEl = null;
        const createTooltip = (text) => {
            if (!tooltipEl) {
                tooltipEl = document.createElement('div');
                tooltipEl.className = 'icon-tooltip';
                document.body.appendChild(tooltipEl);
            }
            tooltipEl.textContent = text;
            return tooltipEl;
        };

        const showTooltip = (target, text) => {
            const el = createTooltip(text);
            // ensure added to DOM and measured
            el.style.left = '-9999px';
            el.style.top = '-9999px';
            // Force reflow so offsetHeight is accurate
            // eslint-disable-next-line no-unused-expressions
            el.offsetHeight;
            const rect = target.getBoundingClientRect();
            // position to the right of minimized sidebar icon
            const left = rect.right + 12; // small gap
            const measuredTop = rect.top + rect.height / 2 - el.offsetHeight / 2;
            const top = Math.max(8, measuredTop);
            el.style.left = left + 'px';
            el.style.top = top + 'px';
            requestAnimationFrame(() => el.classList.add('show'));
        };

    // Render interactive assessments tooltip (used for both hover and click)
    let _docClickHandler = null;
    let hideTimeout = null;
        const renderAssessmentsTooltip = (target) => {
            // ensure any existing tooltip cleaned
            hideTooltip();
            const el = createTooltip('');
            el.innerHTML = `
                <a class="tooltip-item" href="/survey/">Survey</a>
                <a class="tooltip-item" href="/training/">Training Review</a>
                <a class="tooltip-item" href="/evaluation/">Employee Review</a>
            `;

            // position after content is rendered
            el.style.left = '-9999px'; el.style.top = '-9999px';
            // force reflow
            // eslint-disable-next-line no-unused-expressions
            el.offsetHeight;
            const rect = target.getBoundingClientRect();
            const left = rect.right + 12;
            const top = Math.max(8, rect.top + rect.height / 2 - el.offsetHeight / 2);
            el.style.left = left + 'px';
            el.style.top = top + 'px';
            requestAnimationFrame(() => el.classList.add('show'));

            // clicking an item should navigate
            el.addEventListener('click', (ev) => {
                const a = ev.target.closest('a');
                if (!a) return;
                ev.preventDefault();
                const href = a.getAttribute('href');
                if (href) window.location.href = href;
            });

            // hide when clicking outside tooltip
            _docClickHandler = (ev) => {
                if (!el.contains(ev.target) && !target.contains(ev.target)) {
                    hideTooltip();
                    document.removeEventListener('click', _docClickHandler);
                    _docClickHandler = null;
                }
            };
            document.addEventListener('click', _docClickHandler);

            // Keep tooltip open when pointer moves into it
            el.addEventListener('mouseenter', () => {
                if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
            });
            el.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => hideTooltip(), 180);
            });
        };

        const hideTooltip = () => {
            if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
            if (!tooltipEl) return;
            tooltipEl.classList.remove('show');
            setTimeout(() => {
                if (tooltipEl && !tooltipEl.classList.contains('show')) {
                    tooltipEl.remove(); tooltipEl = null;
                }
            }, 200);
        };

        // Attach listeners to elements with data-tooltip inside sidebar
        const tooltipTargets = sidebar.querySelectorAll('[data-tooltip]');
        tooltipTargets.forEach(t => {
            // show only when sidebar is minimized
            t.addEventListener('mouseenter', (e) => {
                if (!sidebar.classList.contains('minimized')) return;
                // For Assessments, show interactive menu on hover as well
                const key = (t.getAttribute('data-tooltip') || '').trim().toLowerCase();
                if (key === 'assessments') {
                    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
                    renderAssessmentsTooltip(t);
                } else {
                    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
                    showTooltip(t, t.getAttribute('data-tooltip'));
                }
            });
            t.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => hideTooltip(), 180);
            });
            t.addEventListener('focus', (e) => {
                if (!sidebar.classList.contains('minimized')) return;
                const key = (t.getAttribute('data-tooltip') || '').trim().toLowerCase();
                if (key === 'assessments') renderAssessmentsTooltip(t);
                else showTooltip(t, t.getAttribute('data-tooltip'));
            });
            t.addEventListener('blur', () => hideTooltip());

            // For click (touch) show interactive tooltip with submenu when minimized
            t.addEventListener('click', (e) => {
                if (!sidebar.classList.contains('minimized')) return;
                e.preventDefault();
                const key = (t.getAttribute('data-tooltip') || '').trim().toLowerCase();
                if (key === 'assessments') {
                    renderAssessmentsTooltip(t);
                } else {
                    showTooltip(t, t.getAttribute('data-tooltip'));
                    setTimeout(hideTooltip, 1600);
                }
            });
        });
    }

    setActiveSidebarItem() {
        const currentPath = window.location.pathname;
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const dataUrl = item.getAttribute('data-url');
            if (dataUrl && dataUrl !== '#') {
                if (currentPath === dataUrl || currentPath.startsWith(dataUrl)) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        });
        
        if (currentPath === '/' || currentPath === '/Overview/Dashboard') {
            const overviewItem = document.querySelector('[data-url="/Overview/Dashboard"]');
            if (overviewItem) {
                overviewItem.classList.add('active');
            }
        }
    }

    getSidebarState() {
        return localStorage.getItem('sidebar-state') || 'expanded';
    }

    saveSidebarState(state) {
        localStorage.setItem('sidebar-state', state);
    }

    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const mobileToggle = document.getElementById('mobile-toggle');
        const icon = mobileToggle.querySelector('i');
        
        mobileToggle.classList.toggle('active');
        sidebar.classList.toggle('mobile-visible');
        
        if (sidebar.classList.contains('mobile-visible')) {
            sidebar.classList.remove('minimized');
            sidebar.classList.remove('mobile-hidden');
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
        } else {
            sidebar.classList.add('mobile-hidden');
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        }
    }

    closeMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const mobileToggle = document.getElementById('mobile-toggle');
        const icon = mobileToggle.querySelector('i');
        
        sidebar.classList.remove('mobile-visible');
        sidebar.classList.add('mobile-hidden');
        mobileToggle.classList.remove('active');
        icon.classList.remove('fa-chevron-left');
        icon.classList.add('fa-chevron-right');
    }

    toggleDesktopSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        sidebar.classList.toggle('minimized');
        
        if (sidebar.classList.contains('minimized')) {
            mainContent.style.marginLeft = 'var(--sidebar-width-minimized)';
            sidebar.classList.remove('expanded');
            this.saveSidebarState('minimized');
        } else {
            mainContent.style.marginLeft = 'var(--sidebar-width-expanded)';
            sidebar.classList.add('expanded');
            this.saveSidebarState('expanded');
        }
        this.positionDropdown();
    }

    setupUserProfile() {
        const userProfile = document.getElementById('user-profile');
        const dropdownMenu = document.getElementById('dropdown-menu');

        if (userProfile && dropdownMenu) {
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('active');
                
                this.positionDropdown();
                
                if (dropdownMenu.classList.contains('active')) {
                    dropdownMenu.style.animation = 'none';
                    setTimeout(() => {
                        dropdownMenu.style.animation = 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
                    }, 10);
                }
            });

            dropdownMenu.addEventListener('click', e => e.stopPropagation());

            document.addEventListener('click', () => {
                if (dropdownMenu.classList.contains('active')) {
                    dropdownMenu.classList.remove('active');
                }
            });
        }
    }

    positionDropdown() {
        const userProfile = document.getElementById('user-profile');
        const dropdownMenu = document.getElementById('dropdown-menu');
        
        if (!userProfile || !dropdownMenu) return;

        if (this.isMobile()) {
            dropdownMenu.style.position = 'absolute';
            dropdownMenu.style.left = '0';
            dropdownMenu.style.bottom = '100%';
            dropdownMenu.style.width = '100%';
            return;
        }

        const userProfileRect = userProfile.getBoundingClientRect();
        const spaceBetween = 10;

        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.left = (userProfileRect.right + spaceBetween) + 'px';
        dropdownMenu.style.bottom = (window.innerHeight - userProfileRect.bottom) + 'px';
        dropdownMenu.style.width = 'auto';
    }

    setupNavigation() {
        const sidebarNavItems = document.querySelectorAll('.nav-item');
        
        sidebarNavItems.forEach(item => {
            const link = item.querySelector('a');
            if (link) {
                link.addEventListener('click', (e) => {
                    const page = link.getAttribute('data-page');
                    const href = link.getAttribute('href');
                    
                    if (page) {
                        e.preventDefault();
                        this.setSidebarActiveItem(item);
                        this.showPage(page);
                        
                        const icon = link.querySelector('svg');
                        if (icon) {
                            icon.style.animation = 'none';
                            setTimeout(() => {
                                icon.style.animation = 'bounceIcon 0.5s ease';
                            }, 10);
                        }
                        
                        if (this.isMobile()) {
                            this.closeMobileSidebar();
                        }
                    } else if (href && href !== '#') {
                        this.setSidebarActiveItem(item);
                        
                        const icon = link.querySelector('svg');
                        if (icon) {
                            icon.style.animation = 'none';
                            setTimeout(() => {
                                icon.style.animation = 'bounceIcon 0.5s ease';
                            }, 10);
                        }
                        
                        if (this.isMobile()) {
                            this.closeMobileSidebar();
                        }
                        
                        this.showPageLoadingIndicator();
                        window.location.href = href;
                    }
                });
            }
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchSuggestions = document.getElementById('searchSuggestions');
        
        if (!searchInput || !searchSuggestions) return;
        
        // Define available modules based on user role
        const availableModules = this.getAvailableModules();
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            
            if (query.length < 2) {
                searchSuggestions.classList.remove('show');
                return;
            }
            
            const filteredModules = availableModules.filter(module => 
                module.name.toLowerCase().includes(query) ||
                module.description.toLowerCase().includes(query)
            );
            
            this.displaySearchSuggestions(filteredModules);
        });
        
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2) {
                const query = searchInput.value.trim().toLowerCase();
                const filteredModules = availableModules.filter(module => 
                    module.name.toLowerCase().includes(query) ||
                    module.description.toLowerCase().includes(query)
                );
                this.displaySearchSuggestions(filteredModules);
            }
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                searchSuggestions.classList.remove('show');
            }
        });
        
        // Show suggestions on keydown
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                e.preventDefault();
                const suggestions = searchSuggestions.querySelectorAll('.navbar-search-suggestion-item');
                const currentIndex = Array.from(suggestions).findIndex(item => item.classList.contains('selected'));
                
                if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0;
                    suggestions.forEach((item, index) => {
                        item.classList.toggle('selected', index === nextIndex);
                    });
                } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1;
                    suggestions.forEach((item, index) => {
                        item.classList.toggle('selected', index === prevIndex);
                    });
                } else if (e.key === 'Enter') {
                    const selectedItem = searchSuggestions.querySelector('.navbar-search-suggestion-item.selected');
                    if (selectedItem) {
                        selectedItem.click();
                    }
                }
            }
        });
    }

    getAvailableModules() {
        // Check if user is admin based on various admin roles
        const isAdmin = document.body.hasAttribute('data-employment-type') && 
                       (document.body.getAttribute('data-employment-type') === 'admin' ||
                        document.body.getAttribute('data-employment-type') === 'hr_admin' ||
                        document.body.getAttribute('data-employment-type') === 'mis_admin' ||
                        document.body.getAttribute('data-employment-type') === 'accounting_admin');
        
        const allModules = [
            {
                name: 'Dashboard',
                description: 'Company overview and statistics',
                url: '/overview/',
                icon: 'fas fa-tachometer-alt'
            },
            {
                name: 'Calendar',
                description: 'View and manage calendar events',
                url: '/calendar/',
                icon: 'fas fa-calendar-alt'
            },
            {
                name: 'PR-Form',
                description: 'Purchase Request Forms',
                url: '/prf/',
                icon: 'fas fa-file-invoice'
            },
            {
                name: 'Certificate',
                description: 'Manage certificates and achievements',
                url: '/certificate/',
                icon: 'fas fa-certificate'
            },
            {
                name: 'Leave Requests',
                description: 'Submit and manage leave requests',
                url: '/leave/',
                icon: 'fas fa-calendar-times'
            },
            {
                name: 'MIS Ticket',
                description: 'Submit and track IT support tickets',
                url: '/ticket/',
                icon: 'fas fa-ticket-alt'
            },
            {
                name: 'Profile',
                description: 'Manage your profile information',
                url: '/profile/',
                icon: 'fas fa-user'
            },
            {
                name: 'Finance',
                description: 'View financial information and payslips',
                url: '/finance/',
                icon: 'fas fa-dollar-sign'
            },
            {
                name: 'Announcements',
                description: 'Company announcements and news',
                url: '/announcement/',
                icon: 'fas fa-bullhorn'
            },
            {
                name: 'Settings',
                description: 'System configuration and preferences',
                url: '/general-settings/',
                icon: 'fas fa-cog'
            }
        ];
        
        if (isAdmin) {
            return allModules;
        } else {
            // Regular users can only access specific modules
            return allModules.filter(module => 
                ['Dashboard', 'Calendar', 'PR-Form', 'Certificate', 'Leave Requests', 'MIS Ticket', 'Profile'].includes(module.name)
            );
        }
    }

    displaySearchSuggestions(modules) {
        const searchSuggestions = document.getElementById('searchSuggestions');
        if (!searchSuggestions) return;
        
        if (modules.length === 0) {
            searchSuggestions.innerHTML = '<div class="navbar-search-suggestion-item">No modules found</div>';
        } else {
            searchSuggestions.innerHTML = modules.map(module => `
                <div class="navbar-search-suggestion-item" onclick="window.location.href='${module.url}'">
                    <div class="module-icon">
                        <i class="${module.icon}"></i>
                    </div>
                    <div class="module-info">
                        <div class="module-name">${module.name}</div>
                        <div class="module-description">${module.description}</div>
                    </div>
                </div>
            `).join('');
        }
        
        searchSuggestions.classList.add('show');
    }

    setupNotifications() {
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationPopover = document.getElementById('notificationPopover');
        
        if (!notificationBtn || !notificationPopover) return;
        
        // Toggle notification popover
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationPopover.classList.toggle('show');
        });
        
        // Hide popover when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationBtn.contains(e.target) && !notificationPopover.contains(e.target)) {
                notificationPopover.classList.remove('show');
            }
        });
        
        // Setup notification item click handlers
        this.setupNotificationItemHandlers();
        
        // Initialize notification count
        this.updateNotificationCount();
        
        // Set initial count and visibility
        const notificationCount = document.getElementById('notificationCount');
        if (notificationCount) {
            const count = this.getNotificationCount();
            notificationCount.textContent = count;
            notificationCount.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    setupNotificationItemHandlers() {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;
        
        // Use event delegation to handle clicks on notification items
        notificationList.addEventListener('click', async (e) => {
            const item = e.target.closest('.notification-item');
            if (!item) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const notificationId = item.dataset.notificationId;
            const notificationUrl = item.dataset.notificationUrl;
            
            // Check if notification ID exists
            if (!notificationId) {
                return;
            }
            
            // Mark as read first
            try {
                const csrfToken = this.getCsrfToken();
                
                const response = await fetch(`/notification/api/mark-read/${notificationId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    }
                });
                
                const responseData = await response.json();
                
                if (response.ok && responseData.success) {
                    // Update the notification item to show as read
                    item.classList.remove('unread');
                    item.classList.add('read');
                    
                    // Update notification count
                    this.updateNotificationCount();
                } else {
                    console.error('Failed to mark notification as read:', responseData);
                }
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
            
            // Navigate to the module URL after a short delay to ensure API call completes
            if (notificationUrl) {
                setTimeout(() => {
                    window.location.href = `/${notificationUrl}/`;
                }, 100);
            }
        });
    }





    updateNotificationCount() {
        const notificationCount = document.getElementById('notificationCount');
        if (!notificationCount) return;
        
        // Count unread notifications with specific types (approved, disapproved, approval)
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        let unreadCount = 0;
        
        unreadItems.forEach(item => {
            const notificationType = item.dataset.notificationType;
            if (notificationType && ['approved', 'disapproved', 'approval'].includes(notificationType)) {
                unreadCount++;
            }
        });
        
        notificationCount.textContent = unreadCount;
        
        // Hide badge if no unread notifications of the specified types
        if (unreadCount === 0) {
            notificationCount.style.display = 'none';
        } else {
            notificationCount.style.display = 'flex';
        }
    }

    getNotificationCount() {
        // Count unread notifications with specific types (approved, disapproved, approval)
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        let unreadCount = 0;
        
        unreadItems.forEach(item => {
            const notificationType = item.dataset.notificationType;
            if (notificationType && ['approved', 'disapproved', 'approval'].includes(notificationType)) {
                unreadCount++;
            }
        });
        
        return unreadCount;
    }







    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        
        return date.toLocaleDateString();
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    }

    setSidebarActiveItem(activeItem) {
        const sidebarNavItems = document.querySelectorAll('.nav-item');
        sidebarNavItems.forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    showPage(pageId) {
        const pages = document.querySelectorAll('.tab-content');
        
        pages.forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            
            setTimeout(() => {
                const statsCards = targetPage.querySelectorAll('.stats-card');
                statsCards.forEach((card, index) => {
                    card.style.animationDelay = `${index * 0.1}s`;
                    card.style.animation = 'fadeIn 0.5s ease forwards';
                });
            }, 100);
        }
        
        const pageNames = {
            'components': 'Components',
            'forms': 'Forms',
            'data': 'Data & Charts',
            'layouts': 'Layouts'
        };
        
        const title = pageNames[pageId] || 'Components';
        document.title = `UniSync - ${title}`;
        document.getElementById('page-title').textContent = title;

        if (pageId === 'data') {
            setTimeout(() => this.reinitializeCharts(), 100);
        }
    }

    showPageLoadingIndicator() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'page-loading-overlay';
        loadingOverlay.className = 'page-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="page-loading-spinner">
                <div style="--size: 64px; --dot-size: 6px; --dot-count: 6; --color: var(--primary-color); --speed: 1s; --spread: 60deg;" class="dots">
                  <div style="--i: 0;" class="dot"></div>
                  <div style="--i: 1;" class="dot"></div>
                  <div style="--i: 2;" class="dot"></div>
                  <div style="--i: 3;" class="dot"></div>
                  <div style="--i: 4;" class="dot"></div>
                  <div style="--i: 5;" class="dot"></div>
                </div>
                <p>Loading page...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.remove();
            }
        }, 2000);
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) this.closeModal(openModal.id);
                
                if (this.isMobile() && document.querySelector('.sidebar').classList.contains('mobile-visible')) {
                    this.closeMobileSidebar();
                }
                
                const dropdownMenu = document.getElementById('dropdown-menu');
                if (dropdownMenu && dropdownMenu.classList.contains('active')) {
                    dropdownMenu.classList.remove('active');
                }
            }
        });

        window.addEventListener('resize', () => {
            this.handleResize();
        });

        window.addEventListener('scroll', () => {
            this.handleScroll();
        });

        // Setup scroll-based scrollbar visibility
        this.setupScrollbarVisibility();
    }

    setupScrollbarVisibility() {
        let scrollTimeout;
        
        // Function to add scrolling class
        const addScrollingClass = (element) => {
            element.classList.add('scrolling');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                element.classList.remove('scrolling');
            }, 1000); // Hide scrollbar 1 second after scrolling stops
        };

        // Add scroll listeners to all scrollable elements
        const setupScrollListener = (element) => {
            element.addEventListener('scroll', () => addScrollingClass(element));
        };

        // Setup for window scroll
        window.addEventListener('scroll', () => addScrollingClass(document.documentElement));

        // Setup for all existing scrollable elements
        const scrollableElements = document.querySelectorAll('[style*="overflow"], .table-container, .data-table, .modal-body, .dropdown-menu, .sidebar, .content');
        scrollableElements.forEach(setupScrollListener);

        // Setup for dynamically added elements using MutationObserver
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the added node is scrollable
                        const style = window.getComputedStyle(node);
                        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
                            style.overflowY === 'auto' || style.overflowY === 'scroll') {
                            setupScrollListener(node);
                        }
                        
                        // Check child elements as well
                        const scrollableChildren = node.querySelectorAll('[style*="overflow"], .table-container, .data-table, .modal-body, .dropdown-menu');
                        scrollableChildren.forEach(setupScrollListener);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    handleResize() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const mobileToggle = document.getElementById('mobile-toggle');
        const icon = mobileToggle.querySelector('i');

        if (window.innerWidth > 768) {
            sidebar.classList.remove('mobile-visible');
            sidebar.classList.remove('mobile-hidden');
            mobileToggle.classList.remove('active');
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
            
            const savedState = this.getSidebarState();
            if (savedState === 'minimized') {
                sidebar.classList.add('minimized');
                mainContent.style.marginLeft = 'var(--sidebar-width-minimized)';
            } else {
                sidebar.classList.add('expanded');
                mainContent.style.marginLeft = 'var(--sidebar-width-expanded)';
            }
        } else {
            mainContent.style.marginLeft = '0';
            if (!sidebar.classList.contains('mobile-visible')) {
                sidebar.classList.remove('minimized');
                sidebar.classList.add('mobile-hidden');
            }
        }
        
        const dropdownMenu = document.getElementById('dropdown-menu');
        if (dropdownMenu && dropdownMenu.classList.contains('active')) {
            this.positionDropdown();
        }

        Object.values(this.charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
            modal.classList.remove('closing');
        });
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('closing');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.classList.remove('closing');
            modal.style.display = 'none';
        }, 200);
    }

    setupTabs() {
        const navTabs = document.querySelectorAll('.tab-btn');
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchMainTab(targetTab, tab);
            });
        });

        const componentTabs = document.querySelectorAll('.tab');
        componentTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanel = tab.dataset.target;
                this.switchComponentTab(targetPanel, tab);
            });
        });
    }

    switchMainTab(targetTab, activeTab) {
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        activeTab.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = document.getElementById(targetTab);
        if (targetContent) {
            targetContent.classList.add('active');
            
            if (targetTab === 'data') {
                setTimeout(() => this.reinitializeCharts(), 100);
            }
        }
    }

    switchComponentTab(targetPanel, activeTab) {
        const tabContainer = activeTab.closest('.tabs-horizontal');
        if (!tabContainer) return;

        tabContainer.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        activeTab.classList.add('active');

        tabContainer.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const targetPanelEl = document.getElementById(targetPanel);
        if (targetPanelEl) {
            targetPanelEl.classList.add('active');
        }
    }

    initializeCharts() {
        this.initPieChart();
        this.initBarChart();
        this.initLineChart();
    }

    initPieChart() {
        const ctx = document.getElementById('pieChart');
        if (!ctx) return;

        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#f8fafc' : '#0f172a';

        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'],
                datasets: [{
                    data: [35, 25, 20, 12, 8],
                    backgroundColor: [
                        '#6366f1',
                        '#06b6d4',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }

    initBarChart() {
        const ctx = document.getElementById('barChart');
        if (!ctx) return;

        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        this.charts.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Performance Score',
                    data: [85, 92, 78, 96, 87, 94],
                    backgroundColor: '#6366f1',
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: textColor
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    initLineChart() {
        const ctx = document.getElementById('lineChart');
        if (!ctx) return;

        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        this.charts.line = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Employee Count',
                    data: [1150, 1180, 1165, 1200, 1225, 1248],
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#06b6d4',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: textColor
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    updateChartsForTheme() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        setTimeout(() => this.initializeCharts(), 100);
    }

    reinitializeCharts() {
        this.updateChartsForTheme();
    }

    setupDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown');
        
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            if (!toggle || !menu) return;

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(dropdown);
            });

            const checkboxes = menu.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.updateDropdownToggleText(dropdown);
                });
            });
        });

        document.addEventListener('click', () => {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        });
    }

    toggleDropdown(dropdown) {
        document.querySelectorAll('.dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('open');
        });

        dropdown.classList.toggle('open');
    }

    updateDropdownToggleText(dropdown) {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
        
        if (checkboxes.length === 0) {
            toggle.childNodes[0].textContent = 'Select Department';
        } else if (checkboxes.length === 1) {
            toggle.childNodes[0].textContent = checkboxes[0].closest('label').textContent.trim();
        } else {
            toggle.childNodes[0].textContent = `${checkboxes.length} selected`;
        }
    }

    setupSearch() {
        const searchInputs = document.querySelectorAll('.search-input');
        
        searchInputs.forEach(input => {
            const clearBtn = input.parentElement.querySelector('.search-clear');
            
            input.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });

            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    input.value = '';
                    input.focus();
                    this.handleSearch('');
                });
            }
        });
    }

    handleSearch(query) {
        const searchIcon = document.querySelector('.search-icon');
        if (searchIcon) {
            searchIcon.style.color = query ? 'var(--primary-color)' : 'var(--text-muted)';
        }
    }

    setupTables() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                this.sortTable(header);
            });
        });
    }

    sortTable(header) {
        const table = header.closest('table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const columnIndex = Array.from(header.parentElement.children).indexOf(header);
        
        const isAscending = header.dataset.sortDirection !== 'asc';
        header.dataset.sortDirection = isAscending ? 'asc' : 'desc';
        
        table.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });
        
        const icon = header.querySelector('i');
        icon.className = isAscending ? 'fas fa-sort-up' : 'fas fa-sort-down';
        
        rows.sort((a, b) => {
            const aValue = a.children[columnIndex].textContent.trim();
            const bValue = b.children[columnIndex].textContent.trim();
            
            const aNum = parseFloat(aValue.replace(/[$,]/g, ''));
            const bNum = parseFloat(bValue.replace(/[$,]/g, ''));
            
            let result;
            if (!isNaN(aNum) && !isNaN(bNum)) {
                result = aNum - bNum;
            } else {
                result = aValue.localeCompare(bValue);
            }
            
            return isAscending ? result : -result;
        });
        
        rows.forEach((row, index) => {
            row.style.transform = 'translateX(-10px)';
            row.style.opacity = '0.7';
            
            setTimeout(() => {
                tbody.appendChild(row);
                row.style.transform = 'translateX(0)';
                row.style.opacity = '1';
            }, index * 50);
        });
    }

    filterProjectTable() {
        const input = document.getElementById('projectSearchInput');
        const filter = input.value.toLowerCase();
        const table = document.getElementById('projectTable');
        const tbody = table.querySelector('tbody');
        
        Array.from(tbody.querySelectorAll('.no-data-row')).forEach(row => row.remove());
        let noDataRow = null;
        const trs = Array.from(tbody.getElementsByTagName('tr')).filter(tr => !tr.classList.contains('no-data-row'));
        let visibleCount = 0;
        let pending = trs.length;

        function showNoData() {
            if (!noDataRow) {
                noDataRow = document.createElement('tr');
                noDataRow.className = 'no-data-row filter-show';
                noDataRow.innerHTML = `<td colspan="5" style="text-align:center; padding: 48px 0;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <i class='fas fa-folder-open' style='font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px;'></i>
                        <div style='font-size: 1.1rem; color: var(--text-muted);'>No data found</div>
                    </div>
                </td>`;
                tbody.appendChild(noDataRow);
                setTimeout(() => noDataRow.classList.remove('filter-show'), 350);
            }
        }

        function hideNoData() {
            if (noDataRow) {
                noDataRow.classList.add('filter-hide');
                setTimeout(() => {
                    if (noDataRow && noDataRow.parentNode) noDataRow.remove();
                }, 350);
            }
        }

        trs.forEach(tr => {
            const tds = tr.getElementsByTagName('td');
            let show = false;
            for (let j = 0; j < tds.length - 1; j++) {
                if (tds[j].textContent.toLowerCase().indexOf(filter) > -1) {
                    show = true;
                    break;
                }
            }
            if (show) {
                tr.classList.remove('filter-hide');
                tr.classList.add('filter-show');
                tr.style.display = '';
                setTimeout(() => tr.classList.remove('filter-show'), 350);
                visibleCount++;
            } else {
                tr.classList.remove('filter-show');
                tr.classList.add('filter-hide');
                setTimeout(() => {
                    tr.style.display = 'none';
                    pending--;
                    if (pending === 0 && visibleCount === 0) showNoData();
                }, 350);
            }
        });
        if (visibleCount > 0) hideNoData();
        if (trs.length === 0) showNoData();
    }

    setupTimeline() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });
        
        timelineItems.forEach(item => {
            observer.observe(item);
        });
    }

    setupForms() {
        const forms = document.querySelectorAll('.form');
        const passwordToggles = document.querySelectorAll('.input-action');
        const fileInputs = document.querySelectorAll('.file-input');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(form);
            });
        });
        
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const input = toggle.previousElementSibling;
                const icon = toggle.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
        
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const label = input.nextElementSibling;
                const span = label.querySelector('span');
                
                if (e.target.files.length > 0) {
                    span.textContent = `${e.target.files.length} file(s) selected`;
                    label.style.borderColor = 'var(--success-color)';
                    label.style.color = 'var(--success-color)';
                } else {
                    span.textContent = 'Choose file or drag here';
                    label.style.borderColor = 'var(--border-color)';
                    label.style.color = 'var(--text-muted)';
                }
            });
        });
        
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateInput(input);
            });
        });
    }

    handleFormSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            this.showNotification('Form submitted successfully!', 'success');
        }, 2000);
    }

    validateInput(input) {
        const value = input.value.trim();
        const type = input.type;
        
        input.classList.remove('valid', 'invalid');
        
        let isValid = true;
        
        if (input.required && !value) {
            isValid = false;
        } else if (type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            isValid = emailRegex.test(value);
        }
        
        input.classList.add(isValid ? 'valid' : 'invalid');
    }

    setupAnimations() {
        const cards = document.querySelectorAll('.component-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        cards.forEach(card => {
            observer.observe(card);
        });
    }

    handleScroll() {
        const scrolled = window.pageYOffset;
        const header = document.querySelector('.header');
        
        if (header) {
            const opacity = Math.max(0, 1 - scrolled / 300);
            header.style.opacity = opacity;
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const toastContainer = this.getToastContainer();
        const toast = this.createToast(message, type);
        toastContainer.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }
        return toast;
    }

    showPersistentNotification(message, type = 'info') {
        const toastContainer = this.getToastContainer();
        const toast = this.createToast(message, type, false);
        toastContainer.appendChild(toast);
        return toast;
    }

    createPersistentProgressToast(message, type = 'success') {
        // Remove any previous uploading toast
        const toastContainer = this.getToastContainer();
        const existing = toastContainer.querySelector('.persistent-toast.uploading-toast');
        if (existing) toastContainer.removeChild(existing);
        // Always use green background for uploading
        const toast = document.createElement('div');
        toast.className = 'toast toast-success persistent-toast uploading-toast';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="spinner-border spinner-border-sm me-2" role="status" style="display:inline-block;vertical-align:middle;"></span>
                <span class="message-text ms-2" style="font-weight:500;">${message}</span>
            </div>
            <button type="button" class="message-close">&times;</button>
        `;
        toast.querySelector('.message-close').addEventListener('click', () => this.removeToast(toast));
        toastContainer.appendChild(toast);
        return toast;
    }

    getToastContainer() {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    createToast(message, type, withSpinner = false) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconHtml = '';
        if (withSpinner) {
            iconHtml = `<span class="spinner-border spinner-border-sm me-2" role="status" style="display:inline-block;vertical-align:middle;"></span>`;
        } else {
            const icon = this.getIconForType(type);
            iconHtml = `<i class="fas fa-${icon}"></i>`;
        }

        toast.innerHTML = `
            <div class="d-flex align-items-center">
                ${iconHtml}
                <span class="message-text ms-2" style="font-weight:500;">${message}</span>
            </div>
            <button type="button" class="message-close">&times;</button>
        `;

        toast.querySelector('.message-close').addEventListener('click', () => this.removeToast(toast));
        return toast;
    }

    getIconForType(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    getTheme() {
        return this.currentTheme;
    }

    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            this.setupTheme();
        }
    }

    openModalPublic(modalId) {
        this.openModal(modalId);
    }

    closeModalPublic(modalId) {
        this.closeModal(modalId);
    }
}

function openModal(modalId) {
    if (window.portalUI) {
        window.portalUI.openModalPublic(modalId);
    }
}

function closeModal(modalId) {
    if (window.portalUI) {
        window.portalUI.closeModalPublic(modalId);
    }
}

function filterProjectTable() {
    if (window.portalUI) {
        window.portalUI.filterProjectTable();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.portalUI = new EmployeePortalUI();
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.portalUI.showNotification('Logging out...', 'info');
            setTimeout(() => {
                window.portalUI.showNotification('Successfully logged out!', 'success');
            }, 1000);
        });
    }

    const demoButton = document.querySelector('.btn-loading');
    if (demoButton) {
        demoButton.addEventListener('click', () => {
            setTimeout(() => {
                demoButton.classList.remove('btn-loading');
                demoButton.innerHTML = 'Completed!';
                setTimeout(() => {
                    demoButton.innerHTML = '<span class="loading-spinner"></span>Loading...';
                    demoButton.classList.add('btn-loading');
                }, 2000);
            }, 3000);
        });
    }

    const projectSearchInput = document.getElementById('projectSearchInput');
    if (projectSearchInput) {
        projectSearchInput.addEventListener('input', filterProjectTable);
    }

    const statsCards = document.querySelectorAll('.stats-card');
    statsCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.animation = 'pulse 0.3s ease';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
            window.portalUI.showNotification('Stats card clicked!', 'info', 2000);
        });
    });
    
    const jobItems = document.querySelectorAll('.job-item');
    jobItems.forEach(item => {
        item.addEventListener('click', function() {
            const jobTitle = this.querySelector('h4').textContent;
            window.portalUI.showNotification(`Opened: ${jobTitle}`, 'info', 2000);
        });
    });
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmployeePortalUI;
}

// Feedback popover handlers
document.addEventListener('DOMContentLoaded', function() {
  const feedbackBtn = document.getElementById('feedbackBtn');
  const popover = document.getElementById('feedbackPopover');
  const popoverClose = document.getElementById('closeFeedbackPopoverBtn');
  const cancelBtn = document.getElementById('cancelFeedbackBtn');
  const feedbackForm = document.getElementById('feedbackModalForm');

  function showPopover() {
  if (!popover) return;
  // notification-style popover: just toggle classes to show
  popover.classList.remove('closing');
  popover.classList.add('show', 'showing');
  popover.setAttribute('aria-hidden', 'false');
  void popover.offsetWidth;
  popover.classList.remove('showing');
  }

  function hidePopover() {
    if (!popover || !popover.classList.contains('show')) return;
    popover.classList.remove('showing');
    popover.classList.add('closing');
    const onEnd = () => {
      popover.classList.remove('show');
      popover.classList.remove('closing');
      popover.setAttribute('aria-hidden', 'true');
      popover.removeEventListener('animationend', onEnd);
    };
    popover.addEventListener('animationend', onEnd);
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!popover) return;
      if (popover.classList.contains('show')) hidePopover(); else showPopover();
    });
  }

  if (popoverClose) popoverClose.addEventListener('click', hidePopover);
  if (cancelBtn) cancelBtn.addEventListener('click', hidePopover);

  // close when clicking outside
  document.addEventListener('click', function(e) {
    if (!popover) return;
    if (!popover.classList.contains('show')) return;
    if (!popover.contains(e.target) && e.target !== feedbackBtn) {
      hidePopover();
    }
  });

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('submitFeedbackBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      }

      const formData = new FormData(this);
      fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
      .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Prefer the site's notification helper when available
                    if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                        window.portalUI.showNotification('Successfully sent', 'success');
                    } else if (typeof showNotification === 'function') {
                        showNotification('Successfully sent', 'success');
                    } else {
                        // Fallback: simple toast element (kept for environments without portalUI)
                        const toast = document.createElement('div');
                        toast.className = 'toast toast-success';
                        toast.textContent = 'Successfully sent';
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 3000);
                    }
                    hidePopover();
                    feedbackForm.reset();
                } else {
                    alert('Failed to send feedback');
                }
            })
      .catch(err => {
        console.error(err);
        alert('Error sending feedback');
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Feedback';
        }
      });
    });
  }
});

(function () {
  // Small, self-contained toggle for the assessments submenu
  const toggle = document.querySelector(".assessments-toggle");
  const submenu = document.getElementById("assessments-submenu");
  if (!toggle || !submenu) return;

  // Ensure submenu starts hidden
  submenu.style.maxHeight = "0px";
  submenu.style.overflow = "hidden";
  submenu.style.opacity = "0";

  function openSubmenu() {
    // Measure and animate
    submenu.classList.add("open");
    const height = submenu.scrollHeight;
    submenu.style.maxHeight = height + "px";
    submenu.style.opacity = "1";
    submenu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    // remove explicit maxHeight after transition so content can grow naturally later
    setTimeout(() => {
      if (submenu.classList.contains("open")) submenu.style.maxHeight = "";
    }, 320);
  }

  function closeSubmenu() {
    // set current height then animate to 0
    const height = submenu.scrollHeight;
    submenu.style.maxHeight = height + "px";
    // allow the browser to register the starting height
    requestAnimationFrame(() => {
      submenu.style.maxHeight = "0px";
      submenu.style.opacity = "0";
      submenu.classList.remove("open");
      submenu.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  toggle.addEventListener("click", function (e) {
    e.preventDefault();
    const sidebar = document.querySelector('.sidebar');
    // If sidebar is minimized, do not open in-place submenu; tooltip handles actions
    if (sidebar && sidebar.classList.contains('minimized')) return;
    if (submenu.classList.contains("open")) closeSubmenu();
    else openSubmenu();
  });

  // Close when clicking outside
  document.addEventListener("click", function (e) {
    if (!submenu.classList.contains("open")) return;
    if (!submenu.contains(e.target) && !toggle.contains(e.target))
      closeSubmenu();
  });

  // Navigation for submenu items
  submenu.addEventListener("click", function (e) {
    const btn = e.target.closest(".submenu-btn");
    if (!btn) return;
    e.preventDefault();
    const target = btn.getAttribute("data-target");
    if (target) window.location.href = target;
  });
})();