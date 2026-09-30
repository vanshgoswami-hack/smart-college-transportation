# 🚌 Smart College Transportation Management System

A modern web-based **College Transportation Management System** designed to simplify and manage college transport operations, including routes, buses, transportation data, and related management workflows.

## 🚀 Overview

The Smart College Transportation Management System provides a centralized platform for managing college transportation activities through a modern web interface.

The project is built with **Next.js, TypeScript, and PostgreSQL**, with a focus on a clean, scalable, and maintainable architecture.

## ✨ Features

* 🚌 College transportation management
* 🛣️ Route and transport management
* 👨‍🎓 Student transportation support
* 📍 Transport-related data management
* 🗄️ PostgreSQL database integration
* 🔐 Authentication and authorization
* 📊 Management dashboard
* 🧪 Automated testing support
* ⚡ Fast development with Next.js and Turbopack
* 📱 Responsive web interface

## 🛠️ Tech Stack

| Technology                 | Purpose                          |
| -------------------------- | -------------------------------- |
| **Next.js**                | Frontend & application framework |
| **TypeScript**             | Type-safe development            |
| **PostgreSQL**             | Database                         |
| **Drizzle ORM**            | Database management              |
| **Tailwind CSS**           | UI styling                       |
| **Node.js**                | Runtime environment              |
| **Git & GitHub**           | Version control                  |
| **Vitest / Testing Tools** | Testing                          |

## 📁 Project Structure

```text
smart-college-transportation/
│
├── src/                  # Application source code
├── tests/                # Test files
├── test-results/         # Test results
├── public/               # Static assets
│
├── package.json          # Project dependencies & scripts
├── package-lock.json     # Dependency lock file
├── drizzle.config.json   # Database configuration
├── next.config.ts        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
├── eslint.config.mjs     # ESLint configuration
├── postcss.config.mjs    # PostCSS configuration
└── .gitignore            # Git ignored files
```

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/vanshgoswami-hack/smart-college-transportation.git
cd smart-college-transportation
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root and add the required database and application environment variables.

> Never commit your `.env` file or expose passwords, API keys, database credentials, or other secrets.

### 4. Start the development server

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:3000
```

## 🗄️ Database

This project uses **PostgreSQL** for database management.

Make sure PostgreSQL is running before starting database-related functionality.

Example:

```bash
sudo systemctl start postgresql
```

Configure your database connection through environment variables in `.env`.

## 🧪 Testing

Run the project's configured tests using the available npm scripts.

```bash
npm test
```

If a different test script is configured in `package.json`, use that command instead.

## 🔒 Security

Please do not commit sensitive information such as:

* Database passwords
* API keys
* Authentication secrets
* `.env` files
* Private credentials

Sensitive files should remain excluded through `.gitignore`.

## 🔄 Updating the Project

After making changes:

```bash
git add .
git commit -m "Update project"
git push
```

## 👨‍💻 Author

**Vansh Goswami**

GitHub: [@vanshgoswami-hack](https://github.com/vanshgoswami-hack)

## 📄 License

This project currently does not specify a license.

---

⭐ If you find this project useful, consider giving the repository a star.
