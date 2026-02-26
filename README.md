# 💬 Open source chat (Beta version 1.8.4)

Open source chat is a real-time open-source messenger with a single global chat room where all users communicate together. No private messages, no separate channels - just one shared space for everyone to connect and chat in real-time.

## ✨ Features

- 🌍 Single global chat room for all users
- 🚀 Real-time messaging with Laravel Reverb
- 💨 Modern and responsive UI built with Tailwind CSS
- 🔐 Secure authentication system
- 📱 Mobile-friendly design
- ⚡ Fast WebSocket connections
- 👥 See all active users in one place
- 🎨 Clean and intuitive interface

## 🛠️ Tech Stack

- **Backend:** Laravel 12
- **Frontend:** Alpine.js, Tailwind CSS
- **Real-time:** Laravel Reverb, Pusher Protocol
- **Build Tool:** Vite
- **Database:** MySQL

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- PHP 8.2 or higher
- Composer
- Node.js 18.x or higher
- npm or yarn
- MySQL 8.0 or higher
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Rostyslawn/opensourcechat.git
cd openchat
```

### 2. Configure Environment

Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Edit `.env` file and configure your database:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=openchat
DB_USERNAME=root
DB_PASSWORD=your_password
```

### 3. Create Database

Create a MySQL database named `openchat`:
```sql
CREATE DATABASE openchat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Install and Setup

Run the complete installation and setup:
```bash
npm run start-project
```

This command will:
- Install PHP dependencies via Composer
- Install Node.js dependencies via npm
- Install and configure Laravel Reverb
- Create storage symbolic link
- Generate application key
- Run database migrations and seeders

### 5. Start the Application

Start all services (Laravel server, Reverb WebSocket server, and Vite dev server):
```bash
npm run start
```

The application will be available at:
- **Application:** http://localhost:8000
- **WebSocket Server:** http://localhost:8080
- **Vite Dev Server:** http://localhost:5173

### 6. Access the Application

**Default Admin Account:**
- **Name:** Admin
- **Password:** Strongpassword228

⚠️ **Important:** Change the admin password after first login for security reasons!

## 🔑 User Registration

OpenChat uses a unique invitation key system for user registration:

1. Log in with the admin account
2. Go to your profile page
3. Generate a unique registration key
4. Share this key with users who want to register
5. Users will need this key to complete their registration

**Important:** Each registration key is single-use only. Once a user successfully registers with a key, it will be automatically deleted and cannot be reused. Generate a new key for each new user.

## 📦 Available Scripts

### Development
```bash
# Start all services in development mode
npm run start

# Start only the Laravel server
npm run serve

# Start only the Reverb WebSocket server
npm run reverb:start

# Start only the Vite dev server
npm run dev
```

### Installation
```bash
# Install backend dependencies
npm run install:backend

# Install frontend dependencies
npm run install:frontend

# Install Laravel Reverb
npm run reverb:install

# Create storage symbolic link
npm run storage:link

# Setup Laravel (generate key, migrate database)
npm run laravel:setup

# Complete project setup (all installation steps)
npm run start-project
```

### Production
```bash
# Build for production and start servers
npm run prod

# Build assets only
npm run build
```

## 🔧 Manual Installation

If you prefer to install step by step:

### 1. Install Backend Dependencies
```bash
composer install
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Generate Application Key
```bash
php artisan key:generate
```

### 4. Install Laravel Reverb
```bash
php artisan reverb:install
```

### 5. Create Storage Symbolic Link
```bash
php artisan storage:link
```

### 6. Run Database Migrations
```bash
php artisan migrate:fresh --seed
```

### 7. Start Services

Open three terminal windows and run:

**Terminal 1 - Laravel Server:**
```bash
php artisan serve
```

**Terminal 2 - Reverb WebSocket Server:**
```bash
php artisan reverb:start
```

**Terminal 3 - Vite Dev Server:**
```bash
npm run dev
```

## 🐛 Troubleshooting

### Error: "Failed to create broadcaster for connection reverb"

Make sure your `.env` file contains Reverb configuration:
```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
```

Then clear config cache:
```bash
php artisan config:clear
```

### Error: "HTTP ERROR 500"

1. Check if `APP_KEY` is generated in `.env`
2. Ensure storage and cache directories are writable:
```bash
# Windows (PowerShell)
icacls storage /grant "Users:(OI)(CI)F" /T
icacls bootstrap\cache /grant "Users:(OI)(CI)F" /T

# Linux/Mac
chmod -R 775 storage bootstrap/cache
```

3. Clear all caches:
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

### Error: "The storage link does not exist" or "403 Forbidden" when accessing files

This error occurs when the symbolic link between `public/storage` and `storage/app/public` is missing. Files uploaded to storage cannot be accessed publicly without this link.

**Solution:**

Create the storage symbolic link:
```bash
npm run storage:link
```

Or manually:
```bash
php artisan storage:link
```

**For Windows users:** If the command fails, run Command Prompt as Administrator and execute:
```cmd
cd path\to\your\project
mklink /D public\storage ..\storage\app\public
```

After creating the link, verify it exists:
- Check that `public/storage` directory/link exists
- Uploaded files should now be accessible at `http://localhost:8000/storage/uploads/...`

### Database Connection Issues

Verify your database credentials in `.env` and ensure MySQL is running:
```bash
php artisan migrate:status
```

## 📁 Project Structure
```
openchat/
├── app/                    # Application core files
├── bootstrap/              # Bootstrap files
├── config/                 # Configuration files
├── database/               # Migrations, seeders, factories
├── public/                 # Public assets
│   └── storage/           # Symbolic link to storage/app/public
├── resources/              # Views, CSS, JS
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── views/             # Blade templates
├── routes/                 # Route definitions
├── storage/                # Logs, cache, uploads
│   └── app/
│       └── public/        # Publicly accessible files
│           └── uploads/   # User uploaded files
├── tests/                  # Test files
├── vendor/                 # Composer dependencies
├── .env                    # Environment configuration
├── composer.json           # PHP dependencies
├── package.json            # Node.js dependencies
├── vite.config.js          # Vite configuration
└── tailwind.config.js      # Tailwind CSS configuration
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

## 👥 Authors

- Rostyslav - [GitHub](https://github.com/Rostyslawn)

## 🙏 Acknowledgments

- Laravel Framework
- Laravel Reverb
- Tailwind CSS
- Alpine.js
- All contributors who help improve this project

## 📞 Support

If you encounter any issues or have questions:

- Open an issue on GitHub
- Check existing issues for solutions
- Read the Laravel documentation: https://laravel.com/docs

---

Made with ❤️ by Rostyslav

---

# 💬 Open source chat

Open source chat — это real-time мессенджер с открытым исходным кодом, построенный на Laravel с одним глобальным чатом, где все пользователи общаются вместе. Никаких личных сообщений, никаких отдельных каналов — только одно общее пространство для всех.

## ✨ Возможности

- 🌍 Единый глобальный чат для всех пользователей
- 🚀 Обмен сообщениями в режиме реального времени через Laravel Reverb
- 💨 Современный и адаптивный интерфейс на Tailwind CSS
- 🔐 Безопасная система аутентификации
- 📱 Мобильная версия
- ⚡ Быстрое WebSocket соединение
- 👥 Все активные пользователи в одном месте
- 🎨 Чистый и интуитивный интерфейс

## 🛠️ Технологии

- **Backend:** Laravel 12
- **Frontend:** Alpine.js, Tailwind CSS
- **Real-time:** Laravel Reverb, Pusher Protocol
- **Сборщик:** Vite
- **База данных:** MySQL

## 📋 Требования

Перед началом убедитесь, что у вас установлено:

- PHP 8.2 или выше
- Composer
- Node.js 18.x или выше
- npm или yarn
- MySQL 8.0 или выше
- Git

## 🚀 Быстрый старт

### 1. Клонируйте репозиторий
```bash
git clone https://github.com/Rostyslawn/opensourcechat.git
cd openchat
```

### 2. Настройте окружение

Скопируйте файл примера окружения и настройте его:
```bash
cp .env.example .env
```

Отредактируйте файл `.env` и настройте базу данных:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=openchat
DB_USERNAME=root
DB_PASSWORD=ваш_пароль
```

### 3. Создайте базу данных

Создайте MySQL базу данных с именем `openchat`:
```sql
CREATE DATABASE openchat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Установка и настройка

Запустите полную установку и настройку одной командой:
```bash
npm run start-project
```

Эта команда выполнит:
- Установку PHP зависимостей через Composer
- Установку Node.js зависимостей через npm
- Установку и настройку Laravel Reverb
- Создание символической ссылки для storage
- Генерацию ключа приложения
- Запуск миграций базы данных и сидеров

### 5. Запуск приложения

Запустите все сервисы (Laravel сервер, Reverb WebSocket сервер и Vite dev сервер):
```bash
npm run start
```

Приложение будет доступно по адресам:
- **Приложение:** http://localhost:8000
- **WebSocket сервер:** http://localhost:8080
- **Vite dev сервер:** http://localhost:5173

### 6. Доступ к приложению

**Аккаунт администратора по умолчанию:**
- **Name:** Admin
- **Пароль:** Strongpassword228

⚠️ **Важно:** Измените пароль администратора после первого входа в целях безопасности!

## 🔑 Регистрация пользователей

OpenChat использует систему уникальных ключей приглашения для регистрации пользователей:

1. Войдите под учетной записью администратора
2. Перейдите на страницу профиля
3. Сгенерируйте уникальный ключ регистрации
4. Поделитесь этим ключом с пользователями, которые хотят зарегистрироваться
5. Пользователям понадобится этот ключ для завершения регистрации

**Важно:** Каждый ключ регистрации одноразовый. После успешной регистрации пользователя ключ автоматически удаляется и не может быть использован повторно. Генерируйте новый ключ для каждого нового пользователя.

## 📦 Доступные команды

### Разработка
```bash
# Запустить все сервисы в режиме разработки
npm run start

# Запустить только Laravel сервер
npm run serve

# Запустить только Reverb WebSocket сервер
npm run reverb:start

# Запустить только Vite dev сервер
npm run dev
```

### Установка
```bash
# Установить backend зависимости
npm run install:backend

# Установить frontend зависимости
npm run install:frontend

# Установить Laravel Reverb
npm run reverb:install

# Создать символическую ссылку storage
npm run storage:link

# Настроить Laravel (сгенерировать ключ, мигрировать БД)
npm run laravel:setup

# Полная настройка проекта (все шаги установки)
npm run start-project
```

### Продакшн
```bash
# Собрать для продакшна и запустить сервера
npm run prod

# Только собрать ассеты
npm run build
```

## 🔧 Ручная установка

Если вы предпочитаете установку по шагам:

### 1. Установите backend зависимости
```bash
composer install
```

### 2. Установите frontend зависимости
```bash
npm install
```

### 3. Сгенерируйте ключ приложения
```bash
php artisan key:generate
```

### 4. Установите Laravel Reverb
```bash
php artisan reverb:install
```

### 5. Создайте символическую ссылку storage
```bash
php artisan storage:link
```

### 6. Запустите миграции базы данных
```bash
php artisan migrate:fresh --seed
```

### 7. Запустите сервисы

Откройте три терминала и выполните:

**Терминал 1 - Laravel сервер:**
```bash
php artisan serve
```

**Терминал 2 - Reverb WebSocket сервер:**
```bash
php artisan reverb:start
```

**Терминал 3 - Vite dev сервер:**
```bash
npm run dev
```

## 🐛 Решение проблем

### Ошибка: "Failed to create broadcaster for connection reverb"

Убедитесь, что ваш файл `.env` содержит конфигурацию Reverb:
```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
```

Затем очистите кэш конфигурации:
```bash
php artisan config:clear
```

### Ошибка: "HTTP ERROR 500"

1. Проверьте, что `APP_KEY` сгенерирован в `.env`
2. Убедитесь, что директории storage и cache доступны для записи:
```bash
# Windows (PowerShell)
icacls storage /grant "Users:(OI)(CI)F" /T
icacls bootstrap\cache /grant "Users:(OI)(CI)F" /T

# Linux/Mac
chmod -R 775 storage bootstrap/cache
```

3. Очистите все кэши:
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

### Ошибка: "The storage link does not exist" или "403 Forbidden" при доступе к файлам

Эта ошибка возникает, когда символическая ссылка между `public/storage` и `storage/app/public` отсутствует. Файлы, загруженные в storage, не могут быть доступны публично без этой ссылки.

**Решение:**

Создайте символическую ссылку storage:
```bash
npm run storage:link
```

Или вручную:
```bash
php artisan storage:link
```

**Для пользователей Windows:** Если команда не работает, запустите Командную строку от имени Администратора и выполните:
```cmd
cd путь\к\вашему\проекту
mklink /D public\storage ..\storage\app\public
```

После создания ссылки проверьте, что она существует:
- Проверьте, что директория/ссылка `public/storage` существует
- Загруженные файлы теперь должны быть доступны по адресу `http://localhost:8000/storage/uploads/...`

### Проблемы с подключением к базе данных

Проверьте учетные данные базы данных в `.env` и убедитесь, что MySQL запущен:
```bash
php artisan migrate:status
```

## 📁 Структура проекта
```
openchat/
├── app/                    # Основные файлы приложения
├── bootstrap/              # Bootstrap файлы
├── config/                 # Конфигурационные файлы
├── database/               # Миграции, сидеры, фабрики
├── public/                 # Публичные ассеты
│   └── storage/           # Символическая ссылка на storage/app/public
├── resources/              # Представления, CSS, JS
│   ├── css/               # Стили
│   ├── js/                # JavaScript файлы
│   └── views/             # Blade шаблоны
├── routes/                 # Определения маршрутов
├── storage/                # Логи, кэш, загрузки
│   └── app/
│       └── public/        # Публично доступные файлы
│           └── uploads/   # Загруженные пользователями файлы
├── tests/                  # Тесты
├── vendor/                 # Composer зависимости
├── .env                    # Конфигурация окружения
├── composer.json           # PHP зависимости
├── package.json            # Node.js зависимости
├── vite.config.js          # Конфигурация Vite
└── tailwind.config.js      # Конфигурация Tailwind CSS
```

## 🤝 Вклад в проект

Мы приветствуем вклад в развитие проекта! Следуйте этим шагам:

1. Сделайте форк репозитория
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Закоммитьте изменения (`git commit -m 'Добавлена новая функция'`)
4. Запушьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Лицензия

Этот проект имеет открытый исходный код и доступен под [MIT License](LICENSE).

## 👥 Авторы

- Rostyslav - [GitHub](https://github.com/Rostyslawn)

## 🙏 Благодарности

- Laravel Framework
- Laravel Reverb
- Tailwind CSS
- Alpine.js
- Всем участникам, помогающим улучшать этот проект

## 📞 Поддержка

Если у вас возникли проблемы или вопросы:

- Откройте issue на GitHub
- Проверьте существующие issues для поиска решений
- Прочитайте документацию Laravel: https://laravel.com/docs

---

Сделано с ❤️ Rostyslav
