# RBAF2.0

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)]()
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)]()
[![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Road Assistance application built using React Native for the user interface, Flask for the backend, and MySQL for the database. This project aims to connect users in need of roadside assistance with available service providers in their vicinity.

## 📌 Table of Contents

- [📌 Table of Contents](#-table-of-contents)
- [📝 Description](#-description)
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Installation](#-installation)
  - [🔧 Backend Setup (road-assist-geo-python)](#-backend-setup-road-assist-geo-python)
  - [📱 User-Side Setup (road-assist-userside)](#-user-side-setup-road-assist-userside)
  - [⚙️ Server Setup](#️-server-setup)
- [🕹️ Usage](#️-usage)
  - [🗺️ Finding the Nearest Provider](#️-finding-the-nearest-provider)
  - [🙋 Requesting Help](#️-requesting-help)
  - [📍 Updating Provider Location](#-updating-provider-location)
  - [✅ Accepting/Completing/Declining Requests (Provider)](#-acceptingcompletingdeclining-requests-provider)
- [🏗️ Project Structure](#️-project-structure)
  - [📁 `road-assist-geo-python`](#-road-assist-geo-python)
  - [📁 `road-assist-userside`](#-road-assist-userside)
  - [📁 `server`](#-server)
- [⚙️ API Reference](#️-api-reference)
  - [Authentication Endpoints](#authentication-endpoints)
  - [User Endpoints](#user-endpoints)
  - [Provider Endpoints](#provider-endpoints)
  - [Request Endpoints](#request-endpoints)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🔗 Important Links](#-important-links)
- [⭐ Show your support](#-show-your-support)

## 📝 Description

RBAF2.0 is a road assistance application designed to facilitate communication and coordination between users requiring assistance and service providers. The application comprises three main components:

- **User-Side (React Native):**  A mobile application built with React Native that allows users to request assistance, view nearby providers, and track their request history. The User-side also supports web platform.
- **Geo-Location Backend (Flask):** A Python-based Flask backend that handles finding the nearest available service provider based on the user's location.It uses the haversine formula to calculate distances.
- **Server (Node.js with Express):**  A Node.js server built with Express.js, responsible for user authentication, provider management, request handling, and real-time updates using Socket.IO. It also features an API documentation using Swagger UI.

## ✨ Features

- 🔑 **User Authentication:** Secure user and provider authentication using JWT (JSON Web Tokens).
- 📍 **Real-time Location Tracking:** Providers can update their location, allowing users to find the nearest available service.
- 🗺️ **Map Integration:** Integration with React Native Maps to display user location and nearby providers.
- 💬 **Real-time Updates:** Utilizes Socket.IO for real-time updates on request status and provider availability.
- 📊 **Provider Management:** Providers can manage their profile, availability, and request history.
- 📱 **Cross-Platform Support:** React Native codebase supports both Android, iOS and Web platforms
- 🛡️ **Rate Limiting:** Implemented rate limiting to prevent abuse of API endpoints.
- 📚 **API Documentation:** Includes Swagger UI for API documentation and testing.
- 🌐 **CORS Enabled:** Flask backend has CORS enabled.

## 🛠️ Tech Stack

- **Frontend:**
  - React Native
  - JavaScript
- **Backend:**
  - Flask (Python)
  - Node.js
  - Express.js
- **Database:**
  - MySQL
- **Realtime Communication:**
  - Socket.IO

## 🚀 Installation

Follow these steps to set up the project locally.

### 🔧 Backend Setup (road-assist-geo-python)

1.  Navigate to the `road-assist-geo-python` directory:
    ```bash
    cd road-assist-geo-python
    ```
2.  Create a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate   # On Linux/macOS
    venv\Scripts\activate.bat  # On Windows
    ```
3.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure the database:
    - Ensure MySQL is installed and running.
    - Create a `.env` file in the `road-assist-geo-python` directory with the following variables:
      ```
      DB_HOST=localhost
      DB_USER=root
      DB_PASSWORD=your_db_password
      DB_NAME=road_assistance_app
      ```
5.  Run the Flask application:
    ```bash
    python app.py
    ```

### 📱 User-Side Setup (road-assist-userside)

1.  Navigate to the `road-assist-userside` directory:
    ```bash
    cd road-assist-userside
    ```
2.  Install the required Node.js packages:
    ```bash
    npm install
    ```
3.  Start the Expo development server:
    ```bash
    npm start
    ```

    This will provide options to run the app on Android, iOS, or web.

### ⚙️ Server Setup

1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Install the required Node.js packages:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `server` directory. Example:
    ```
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_db_password
    DB_NAME=road_assistance_app
    JWT_SECRET=your-secret-key
    PORT=5000
    ```

4. Start the server:
    ```bash
    npm start
    ```

## 🕹️ Usage

### 🗺️ Finding the Nearest Provider

1.  Ensure the Flask backend is running.
2.  The React Native app will send a POST request to the `/find-nearest-provider` endpoint with the user's latitude and longitude.
    ```json
    {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
    ```
3.  The backend will return the nearest available service provider.
    ```json
    {
      "provider": {
        "id": 1,
        "name": "Example Provider",
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "distance_km": 5.2
    }
    ```

### 🙋 Requesting Help

1.  Ensure the Node.js server is running.
2.  The React Native app will send a POST request to the `/api/request-help` endpoint with the user ID, provider ID, location, and issue type.
    ```json
    {
      "user_id": 1,
      "provider_id": 1,
      "latitude": 37.7749,
      "longitude": -122.4194,
      "issue_type": "Flat Tire"
    }
    ```
3.  The server will create a help request and emit a Socket.IO event to notify the provider.

### 📍 Updating Provider Location

1.  Ensure the Node.js server is running.
2.  The provider's app will send a PUT request to the `/api/update-location/:id` endpoint with the provider's latitude and longitude.
    ```json
    {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
    ```
3.  The server will update the provider's location in the database.

### ✅ Accepting/Completing/Declining Requests (Provider)

1.  Ensure the Node.js server is running.
2.  The provider can accept a request by sending a PUT request to `/api/requests/:id/accept`.
3.  The provider can complete a request by sending a PUT request to `/api/requests/:id/complete`.
4.  The provider can decline a request by sending a PUT request to `/api/requests/:id/decline`.

## 🏗️ Project Structure

The project is structured into three main directories:

### 📁 `road-assist-geo-python`

-   `app.py`: Contains the Flask backend application for finding the nearest service provider.
-   `requirements.txt`: Lists the Python dependencies for the backend.
-   `.env`: Stores database credentials and other environment variables.  Important: Ensure you create this file and populate it with your database settings.
-   `utils/`: Contains utility modules, such as `cache.py` for Redis caching and `provider_matcher.py` for provider matching logic.

### 📁 `road-assist-userside`

-   `App.js`: The main entry point for the React Native application, handling navigation and global interceptors.
-   `index.js`: Registers the root component and sets global Axios defaults.
-   `app.json`: Contains configuration settings for the Expo app.
-   `components/`: Contains reusable React Native components, such as `Map` and `ConnectionMonitor`.
-   `screens/`: Contains the different screens of the application, such as `LoginScreen`, `SignupScreen`, and `UserDashboard`.
-   `config/`: Contains configuration files, such as `api.js` for API endpoints and `socket.js` for Socket.IO configuration.

### 📁 `server`

-   `server.js`: The main entry point for the Node.js server, handling user authentication, provider management, and request handling.
-   `routes/`: Contains the route handlers for authentication (`auth.js`) and provider management (`provider.js`).
-   `middleware/`: Contains middleware functions for authentication (`auth.js`) and validation (`validation.js`).
-   `config/`: Contains configuration files, such as `db.js` for database configuration.
- `socket.js`: Configures Socket.IO for real-time communication.

## ⚙️ API Reference

### Authentication Endpoints

| Method | Endpoint       | Description                                          |
| :----- | :------------- | :--------------------------------------------------- |
| POST   | `/api/signup`  | Registers a new user or service provider.           |
| POST   | `/api/login`   | Authenticates a user and returns a JWT.            |

### User Endpoints

| Method | Endpoint                  | Description                                                    |
| :----- | :------------------------ | :------------------------------------------------------------- |
| POST   | `/api/request-help`       | Creates a new help request.                                    |
| GET    | `/api/user-requests/:userId` | Retrieves the request history for a specific user.             |
| POST   | `/api/match-providers`    | Retrieves a list of providers matched to the location.       |

### Provider Endpoints

| Method | Endpoint                        | Description                                                                  |
| :----- | :------------------------------ | :--------------------------------------------------------------------------- |
| GET    | `/api/provider/profile`         | Retrieves the profile information for a provider.                            |
| GET    | `/api/provider/stats/:providerId` | Retrieves statistics for a provider, such as total completed requests.      |
| GET    | `/api/open-requests`            | Retrieves a list of open requests for a provider.                            |
| PUT    | `/api/requests/:id/assign`       | Assigns a request to a provider.                                             |
| PUT    | `/api/requests/:id/status`       | Updates the status of a request (e.g., accepted, completed, cancelled).     |
| PUT    | `/:id/availability`              | Updates provider availability                                                |

### Request Endpoints

| Method | Endpoint                | Description                                             |
| :----- | :---------------------- | :------------------------------------------------------ |
| PUT    | `/api/requests/:id/accept`   | Accepts a service request                                     |
| PUT    | `/api/requests/:id/complete` | Marks a service request as completed                            |
| PUT    | `/api/requests/:id/decline`  | Declines a service request                                    |
| PUT    | `/api/requests/:id/cancel`   | Cancels a service request                                     |
| GET    | `/api/requests/:id`      | Retrieves details of a request.                               |
## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with descriptive messages.
4.  Submit a pull request.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Important Links

-   **Repository:** [https://github.com/Kausa18/RBAF2.0](https://github.com/Kausa18/RBAF2.0)

## ⭐ Show your support

Give a ⭐️ if this project helped you! Also, feel free to fork the repository and contribute.


---


**RBAF2.0** - [https://github.com/Kausa18/RBAF2.0](https://github.com/Kausa18/RBAF2.0) - Fork this repository, like it, give us stars, open issues, contribute.

Author: [Kausa18](https://github.com/Kausa18) - Contact: Not Available


---
**<p align="center">Generated by [ReadmeCodeGen](https://www.readmecodegen.com/)</p>**