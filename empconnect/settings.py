from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-c!cp8+y36^cwsf*@*g+r_@5!93atgsqt^cv98vag@3+9xu5si9'

DEBUG = True

ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'dashboard.apps.DashboardConfig',
    'usercalendar.apps.UsercalendarConfig',
    'userlogin.apps.UserloginConfig',
    'notification.apps.NotificationConfig',
    'prf.apps.PrfConfig',
    'certificate.apps.CertificateConfig',
    'userprofile.apps.UserprofileConfig',
    'generalsettings.apps.GeneralsettingsConfig',
    'finance.apps.FinanceConfig',
    'leaverequest.apps.LeaverequestConfig',
    'ticketing.apps.TicketingConfig',
    'announcement.apps.AnnouncementConfig',
    'feedback.apps.FeedbackConfig',
    'survey.apps.SurveyConfig',
    'training.apps.TrainingConfig',
    'evaluation.apps.EvaluationConfig',
]

AUTH_USER_MODEL = 'userlogin.EmployeeLogin'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'mis.repco.it@gmail.com'
EMAIL_HOST_PASSWORD = 'piqghkngsohhzclg'
DEFAULT_FROM_EMAIL = 'mis.repco.it@gmail.com'

ROOT_URLCONF = 'empconnect.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates'
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    )
}

WSGI_APPLICATION = 'empconnect.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Manila'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'

STATICFILES_DIRS =[
    BASE_DIR / 'static'
]

MEDIA_ROOT = BASE_DIR / 'static/images'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
