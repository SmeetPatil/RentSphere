# 🏠 RentSphere

> A secure, feature-rich online rental marketplace connecting users directly for tech equipment and item rentals.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue.svg)](https://www.postgresql.org/)

## 🌟 Features

### Core Functionality

- **📦 Rental Marketplace** - Browse, search, and rent items with detailed listings
- **🗺️ Location-Based Search** - Interactive map with nearby rentals
- **💬 Real-Time Messaging** - Direct communication between renters and listers
- **📸 Image Management** - Google Drive integration with 2TB storage
- **🔐 Secure Authentication** - Passport.js with local and OAuth strategies

### Advanced Features

- **🚚 Delivery System**
  - Home delivery or self-pickup options
  - Real-time delivery tracking with status updates
  - Distance-based cost calculation
  - Automatic status progression (shipped → en route → delivered)

- **⭐ Dual Rating System**
  - Delivery ratings (delivery speed, item condition, communication)
  - Owner ratings (overall experience)
  - Aggregate ratings displayed on listings

- **💳 Payment Processing**
  - Rental payments with platform fee (10%)
  - Delivery fee handling
  - Transaction receipts

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 14+
- Google Drive OAuth credentials (for image storage)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/SmeetPatil/rent-sphere.git
   cd rent-sphere
   ```

2. **Install dependencies**

   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # Session
   SESSION_SECRET=your-session-secret
   
   # Google Drive OAuth (for image storage)
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REFRESH_TOKEN=your-refresh-token
   
   # Server
   PORT=8085
   ```

4. **Initialize the database**

   ```bash
   node setup/initdb.js
   node setup/rental-tables-setup.js
   node setup/messaging-tables.js
   ```

5. **Run the application**

   ```bash
   # Development mode (with hot reload)
   npm run dev

   # Production mode
   npm run project
   ```

6. **Access the application**
   - Frontend: <http://localhost:8085>
   - Backend API: <http://localhost:8085/api>

## 📁 Project Structure

```text
rent-sphere/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Dashboard/
│   │   │   ├── Messaging/
│   │   │   └── Rentals/   # Rental, delivery, rating components
│   │   └── App.js
│   └── build/             # Production build
├── routes/                # Express API routes
│   ├── api.routes.js
│   ├── auth.routes.js
│   ├── delivery-rating.routes.js
│   ├── image.routes.js
│   ├── messaging.routes.js
│   └── rental.routes.js
├── auth/                  # Authentication logic
│   ├── passport.js
│   └── userService.js
├── middleware/            # Express middleware
├── services/              # Business logic
│   ├── googleDriveService.js
│   └── simpleImageService.js
├── setup/                 # Database setup scripts
├── public/               # Static files
└── server.js             # Express server entry point
```

## 🔧 Tech Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: Passport.js
- **Session Management**: express-session
- **File Upload**: Multer
- **Storage**: Google Drive API

### Frontend

- **Framework**: React
- **Routing**: React Router
- **HTTP Client**: Axios
- **Maps**: Leaflet (OpenStreetMap)
- **Styling**: CSS3

## 📖 API Documentation

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Rentals

- `GET /api/rentals` - Get all listings
- `GET /api/rental/:id` - Get listing details
- `POST /api/rentals` - Create new listing
- `PUT /api/rentals/:id` - Update listing
- `DELETE /api/rentals/:id` - Delete listing
- `POST /api/rental-requests` - Create rental request

### Delivery & Tracking

- `POST /api/calculate-delivery-cost` - Calculate delivery cost
- `POST /api/choose-delivery-option` - Select delivery method
- `POST /api/pay-delivery` - Process delivery payment
- `GET /api/delivery-tracking/:requestId` - Get tracking info
- `GET /api/simulate-delivery-progress` - Update delivery statuses

### Ratings

- `POST /api/rental-requests/:id/rate` - Submit delivery rating
- `POST /api/rental-requests/:id/rate-owner` - Submit owner rating
- `GET /api/listings/:id/delivery-ratings` - Get listing ratings

### Messaging

- `GET /api/conversations` - Get user conversations
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/messages` - Send message

## 🛠️ Development

### Running Tests

```bash
# Test database connection
node setup/test-connection.js

# Reset delivery data (for testing)
node setup/reset-delivery-payments.js
```

### Building for Production

```bash
# Build frontend
cd client
npm run build

# Start production server
npm start
```

## 🔐 Google Drive Setup

RentSphere uses Google Drive for image storage with OAuth2 authentication.

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable Google Drive API

2. **Create OAuth Credentials**
   - Go to "Credentials" section
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs
   - Download credentials

3. **Get Refresh Token**

   ```bash
   node services/get-refresh-token.js
   ```

4. **Update .env file**

   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REFRESH_TOKEN=your-refresh-token
   ```

## 📊 Database Schema

### Key Tables

- **users** - User accounts and authentication
- **listings** - Rental item listings
- **rental_requests** - Rental bookings and transactions
- **delivery_events** - Delivery tracking history
- **delivery_ratings** - Delivery experience ratings
- **user_ratings** - Owner/renter ratings
- **conversations** - Messaging conversations
- **messages** - Chat messages

See [OVERVIEW.md](OVERVIEW.md) for detailed schema documentation.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

### Smeet Patil

- GitHub: [@SmeetPatil](https://github.com/SmeetPatil)

## 🙏 Acknowledgments

- OpenStreetMap for map tiles
- Google Drive API for storage
- Neon for PostgreSQL hosting
- All contributors and users

## 📞 Support

For support, please open an issue on GitHub or contact the maintainer.

---

Made with ❤️ by Smeet Patil
