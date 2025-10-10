# RentSphere Technical Overview

> Complete technical documentation for developers working on RentSphere

## Table of Contents

- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Delivery System](#delivery-system)
- [Rating System](#rating-system)
- [Authentication](#authentication)
- [Frontend Components](#frontend-components)
- [Google Drive Integration](#google-drive-integration)
- [Troubleshooting](#troubleshooting)
- [Testing Guide](#testing-guide)
- [License](#license)

---

<a id="architecture"></a>

## Architecture

### System Overview

RentSphere is a full-stack web application built with:

- **Backend**: Node.js + Express.js
- **Frontend**: React (Single Page Application)
- **Database**: PostgreSQL (hosted on Neon)
- **Storage**: Google Drive API
- **Session**: express-session with PostgreSQL store

### Request Flow

````text

User → React App → Axios → Express API → PostgreSQL/Google Drive → Response

```text

### Key Design Patterns

- **MVC Pattern**: Models (database), Views (React), Controllers (routes)
- **Middleware Chain**: Authentication → Validation → Business Logic → Response
- **Service Layer**: Separate services for Google Drive, image processing
- **Stateless Auth**: Session-based authentication with secure cookies

---

<a id="database-schema"></a>

## Database Schema

### Users Table

```sql

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    profile_picture_url VARCHAR(255),
    location_lat DECIMAL(10, 8),
    location_lon DECIMAL(11, 8),
    location_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

```text

### Listings Table

```sql

CREATE TABLE listings (
    listing_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price_per_day DECIMAL(10, 2) NOT NULL,
    price_per_week DECIMAL(10, 2),
    price_per_month DECIMAL(10, 2),
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lon DECIMAL(11, 8) NOT NULL,
    location_address TEXT NOT NULL,
    availability BOOLEAN DEFAULT TRUE,
    images TEXT[], -- Array of Google Drive file IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

```text

### Rental Requests Table


```sql

CREATE TABLE rental_requests (
    request_id SERIAL PRIMARY KEY,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    renter_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    owner_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rental_days INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, denied, paid, returned
    message TEXT,

    -- Delivery fields
    delivery_option VARCHAR(10), -- 'pickup' or 'delivery'
    delivery_cost DECIMAL(10, 2),
    distance_km DECIMAL(10, 2),
    delivery_address TEXT,
    delivery_lat DECIMAL(10, 8),
    delivery_lon DECIMAL(11, 8),
    delivery_status VARCHAR(20), -- shipped, en_route, delivered
    expected_en_route_at TIMESTAMP,
    expected_delivered_at TIMESTAMP,

    -- Payment tracking
    payment_received BOOLEAN DEFAULT FALSE,
    payment_date TIMESTAMP,
    platform_fee DECIMAL(10, 2),

    -- Rating tracking
    delivery_rated BOOLEAN DEFAULT FALSE,
    owner_rated BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

```text

### Delivery Events Table


```sql

CREATE TABLE delivery_events (
    event_id SERIAL PRIMARY KEY,
    request_id INT REFERENCES rental_requests(request_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'shipped', 'en_route', 'delivered'
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

```text

### Delivery Ratings Table


```sql

CREATE TABLE delivery_ratings (
    rating_id SERIAL PRIMARY KEY,
    request_id INT REFERENCES rental_requests(request_id) ON DELETE CASCADE,
    renter_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    delivery_speed_rating INT CHECK (delivery_speed_rating BETWEEN 1 AND 5),
    item_condition_rating INT CHECK (item_condition_rating BETWEEN 1 AND 5),
    communication_rating INT CHECK (communication_rating BETWEEN 1 AND 5),
    overall_rating DECIMAL(3, 2), -- Calculated average
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

```text

### User Ratings Table


```sql

CREATE TABLE user_ratings (
    rating_id SERIAL PRIMARY KEY,
    request_id INT REFERENCES rental_requests(request_id) ON DELETE CASCADE,
    rater_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    rated_user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    rating_type VARCHAR(20), -- 'owner' or 'renter'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

```text

### Conversations & Messages Tables


```sql

CREATE TABLE conversations (
    conversation_id SERIAL PRIMARY KEY,
    user1_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    user2_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id, listing_id)
);

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    conversation_id INT REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

```text

---

<a id="api-reference"></a>

## API Reference

### Authentication Endpoints

#### POST `/api/auth/register`

Register a new user account.

**Request Body:**

```json

{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "password": "securePassword123"
}

```text

**Response:** `201 Created`

```json

{
  "message": "User registered successfully",
  "userId": 1
}

```text

#### POST `/api/auth/login`

Authenticate user and create session.

**Request Body:**

```json

{
  "phone": "+1234567890",
  "password": "securePassword123"
}

```text

**Response:** `200 OK`

```json

{
  "message": "Login successful",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com"
  }
}

```text

---

### Rental Endpoints

#### GET `/api/rentals`

Get all available listings with optional filtering.

**Query Parameters:**

- `category` (optional): Filter by category
- `search` (optional): Search in title/description

**Response:** `200 OK`

```json

[
  {
    "listing_id": 1,
    "title": "Canon EOS R5",
    "description": "Professional mirrorless camera",
    "category": "Cameras",
    "price_per_day": 50.00,
    "location_address": "123 Main St, City",
    "images": ["drive_file_id_1", "drive_file_id_2"],
    "availability": true,
    "owner_name": "Jane Smith",
    "average_rating": 4.75
  }
]

```text

#### GET `/api/rental/:id`

Get detailed information about a specific listing.

**Response:** `200 OK`

```json

{
  "listing_id": 1,
  "title": "Canon EOS R5",
  "description": "Professional mirrorless camera with 8K video",
  "category": "Cameras",
  "price_per_day": 50.00,
  "price_per_week": 300.00,
  "price_per_month": 1000.00,
  "location_lat": 40.7128,
  "location_lon": -74.0060,
  "location_address": "123 Main St, New York, NY",
  "images": ["drive_file_id_1"],
  "availability": true,
  "owner": {
    "user_id": 2,
    "name": "Jane Smith",
    "profile_picture_url": "drive_file_id"
  }
}

```text

#### POST `/api/rentals`

Create a new listing (requires authentication).

**Request Body:**

```json

{
  "title": "Canon EOS R5",
  "description": "Professional camera",
  "category": "Cameras",
  "price_per_day": 50.00,
  "price_per_week": 300.00,
  "price_per_month": 1000.00,
  "location_lat": 40.7128,
  "location_lon": -74.0060,
  "location_address": "123 Main St, New York, NY",
  "images": [] // Uploaded separately via /api/upload
}

```text

**Response:** `201 Created`

#### POST `/api/rental-requests`

Create a rental request (booking).

**Request Body:**

```json

{
  "listing_id": 1,
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "message": "I need this for a wedding shoot"
}

```text

**Response:** `201 Created`

---

### Delivery & Tracking Endpoints

#### POST `/api/calculate-delivery-cost`

Calculate delivery cost based on distance.

**Request Body:**

```json

{
  "listingLat": 40.7128,
  "listingLon": -74.0060,
  "deliveryLat": 40.7580,
  "deliveryLon": -73.9855
}

```text

**Response:** `200 OK`

```json

{
  "distance": 5.2,
  "cost": 26.00,
  "details": "₹5 per km"
}

```text

**Cost Formula:** `distance * 5`

#### POST `/api/choose-delivery-option`

Select pickup or delivery method.

**Request Body:**

```json

{
  "requestId": 1,
  "deliveryOption": "delivery",
  "deliveryAddress": "456 Park Ave, New York, NY",
  "deliveryCost": 26.00,
  "distance": 5.2,
  "deliveryLat": 40.7580,
  "deliveryLon": -73.9855
}

```text

**Response:** `200 OK`

#### POST `/api/pay-delivery`

Process delivery payment and initiate shipping.

**Request Body:**

```json

{
  "requestId": 1,
  "amount": 276.00, // rental + delivery + platform fee
  "platformFee": 25.00
}

```text

**Response:** `200 OK`

**Side Effects:**

- Creates delivery event with status `shipped`
- Calculates and stores `expected_en_route_at` (1-1.5 hours from now)
- Calculates and stores `expected_delivered_at` (3-12 hours based on distance)
- Updates `rental_requests` with payment info and delivery status

#### GET `/api/delivery-tracking/:requestId`

Get delivery tracking information.

**Response:** `200 OK`

```json

{
  "requestId": 1,
  "deliveryStatus": "en_route",
  "estimatedDelivery": "2024-01-15T18:30:00Z",
  "events": [
    {
      "event_type": "shipped",
      "event_time": "2024-01-15T10:00:00Z",
      "notes": "Package shipped from owner"
    },
    {
      "event_type": "en_route",
      "event_time": "2024-01-15T11:30:00Z",
      "notes": "Out for delivery"
    }
  ]
}

```text

#### GET `/api/simulate-delivery-progress`

Background endpoint to update delivery statuses (polled by frontend).

**Logic:**

- Checks all rentals with `delivery_status IN ('shipped', 'en_route')`
- Compares current time with stored `expected_en_route_at` and `expected_delivered_at`
- Updates status when expected time is reached
- Creates corresponding delivery events

---

### Rating Endpoints

#### POST `/api/rental-requests/:id/rate`

Submit delivery rating (by renter).

**Request Body:**

```json

{
  "deliverySpeed": 5,
  "itemCondition": 5,
  "communication": 4,
  "reviewText": "Great experience!"
}

```text

**Response:** `200 OK`

**Calculated Fields:**

- `overall_rating` = average of three ratings

#### POST `/api/rental-requests/:id/rate-owner`

Submit owner rating (by renter).

**Request Body:**

```json

{
  "rating": 5,
  "reviewText": "Excellent owner!"
}

```text

**Response:** `200 OK`

#### GET `/api/listings/:id/delivery-ratings`

Get all delivery ratings for a listing.

**Response:** `200 OK`

```json

[
  {
    "delivery_speed_rating": 5,
    "item_condition_rating": 5,
    "communication_rating": 4,
    "overall_rating": 4.67,
    "review_text": "Great experience!",
    "renter_name": "John Doe",
    "created_at": "2024-01-20T12:00:00Z"
  }
]

```text

---

### Messaging Endpoints

#### GET `/api/conversations`

Get all conversations for logged-in user.

**Response:** `200 OK`

```json

[
  {
    "conversation_id": 1,
    "other_user_name": "Jane Smith",
    "listing_title": "Canon EOS R5",
    "last_message": "When can I pick it up?",
    "last_message_time": "2024-01-15T14:30:00Z"
  }
]

```text

#### GET `/api/conversations/:id/messages`

Get all messages in a conversation.

**Response:** `200 OK`

```json

[
  {
    "message_id": 1,
    "sender_id": 1,
    "sender_name": "John Doe",
    "message_text": "Is this still available?",
    "created_at": "2024-01-15T14:00:00Z"
  },
  {
    "message_id": 2,
    "sender_id": 2,
    "sender_name": "Jane Smith",
    "message_text": "Yes, it is!",
    "created_at": "2024-01-15T14:05:00Z"
  }
]

```text

#### POST `/api/messages`

Send a message in a conversation.

**Request Body:**

```json

{
  "conversationId": 1,
  "messageText": "Great! I'll take it."
}

```text

**Response:** `201 Created`

---

<a id="delivery-system"></a>

## Delivery System

### Overview

The delivery system allows renters to choose between self-pickup and home delivery with real-time tracking.

### Delivery Flow

1. **Rental Request Approved**
   - Renter sees "Choose Delivery Option" button
   - Can select pickup (free) or delivery (distance-based cost)

2. **Delivery Option Selection**
   - Frontend calculates distance using Haversine formula
   - Backend stores: `delivery_option`, `delivery_cost`, `distance_km`, `delivery_address`, `delivery_lat`, `delivery_lon`

3. **Payment Processing**
   - Total = rental amount + delivery cost + platform fee (10%)
   - Backend calculates fixed expected times:
     - `expected_en_route_at` = CURRENT_TIMESTAMP + 1-1.5 hours (random)
     - `expected_delivered_at` = CURRENT_TIMESTAMP + (distance * 15 minutes) + 3-12 hours (random)
   - Creates initial delivery event: `shipped`

4. **Delivery Simulation**
   - Frontend polls `/api/simulate-delivery-progress` every 30 seconds
   - Backend checks if current time > expected times
   - Auto-updates status: `shipped` → `en_route` → `delivered`
   - Creates corresponding delivery events with `event_time = CURRENT_TIMESTAMP`

5. **Tracking Display**
   - Shows current status with timeline
   - Displays estimated delivery time (never changes after calculation)
   - Shows delivery events with timestamps

### Key Implementation Details

**Fixed Timing Algorithm:**

```javascript

// At payment time (never recalculated)
const enRouteMinutes = 60 + Math.floor(Math.random() * 30); // 60-90 min
const deliveryMinutes = (distance * 15) + 180 + Math.floor(Math.random() * 540); // 3-12 hrs

const expectedEnRouteAt = new Date(Date.now() + enRouteMinutes * 60000);
const expectedDeliveredAt = new Date(Date.now() + deliveryMinutes * 60000);

```text

**Status Progression:**

- `shipped` → item left owner's location
- `en_route` → item is on the way (1-1.5 hours after shipped)
- `delivered` → item reached destination (3-12 hours based on distance)

---

<a id="rating-system"></a>

## Rating System

### Overview

### Dual Rating System

#### 1. Delivery Ratings

Submitted by **renter** after item is delivered.

**Components:**

- Delivery Speed (1-5 stars)
- Item Condition (1-5 stars)
- Communication (1-5 stars)
- Overall Rating (calculated average)
- Review Text (optional)

**Aggregation:**

- All ratings for a listing are averaged
- Displayed on listing cards and detail pages

#### 2. Owner Ratings

Submitted by **renter** about the owner's overall service.

**Components:**

- Overall Rating (1-5 stars)
- Review Text (optional)

**Storage:**

- Stored in `user_ratings` table with `rating_type = 'owner'`
- Used for owner reputation

### Rating Display

**On Listing Cards:**

```text

⭐ 4.7 (23 ratings)

```text

**On Listing Detail:**

- Average rating with breakdown
- Individual review cards with ratings and text
- Renter names and timestamps

---

<a id="authentication"></a>

## Authentication

### Overview

### Session-Based Authentication

**Flow:**
1. User submits credentials via login form
2. Backend verifies with bcrypt password hash
3. Creates session with `express-session`
4. Session stored in PostgreSQL
5. Returns session cookie to client

**Middleware Protection:**

```javascript

// auth.js middleware
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
````

**Protected Routes:**

- All `/api/rentals` POST/PUT/DELETE
- All `/api/rental-requests`
- All `/api/messages`
- `/api/upload`

---

<a id="frontend-components"></a>

## Frontend Components

### Key React Components

#### `RentalBrowse.js`

- Displays all listings in grid view
- Filter by category
- Search functionality
- Integrated map with markers

#### `RentalDetail.js`

- Shows listing details
- Image carousel
- "Request to Rent" form
- Delivery ratings display

#### `MyRentalRequests.js`

- Shows renter's bookings
- Delivery option selection modal
- Payment modal with fee breakdown
- Delivery tracking modal
- Rating modals (delivery & owner)
- Return confirmation

#### `MyListingRequests.js`

- Shows owner's incoming requests
- Approve/deny functionality
- Delivery tracking for owner
- Owner rating modal (rate renter)

#### `DeliveryTracking.js`

- Timeline visualization
- Status indicators (shipped, en route, delivered)
- Delivery events with timestamps
- Estimated delivery time

#### `Messaging/`

- `ConversationList.js` - List of chats
- `Conversation.js` - Message thread
- `NewConversation.js` - Start new chat

### Modal Rendering Pattern

**Fixed Approach (React Fragments):**

````jsx

return (
  <>
    <div className="rentals-page">
      {/* Page content */}
    </div>

    {/* Modals rendered at document root level */}
    {showPaymentModal && <PaymentModal />}
    {showTrackingModal && <DeliveryTracking />}
  </>
);

```text

```text

This ensures modals render over the entire page including navbar.

---

<a id="google-drive-integration"></a>

## Google Drive Integration

### Overview

### OAuth2 Setup

**Cross-Account Configuration:**

- OAuth App Owner: `smeetpatil878@gmail.com`
- Storage Account: `thunderblack994@gmail.com` (2TB storage)

**Required Environment Variables:**

```env

GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

```text

### Image Upload Flow

1. **Frontend** - User selects images via file input
2. **Multer** - Processes multipart/form-data
3. **Image Service** - Validates and processes images
4. **Google Drive API** - Uploads to dedicated folder
5. **Database** - Stores Drive file IDs in `listings.images[]`

### Image Processing

**Specifications:**

- Max file size: 5MB per image
- Max images per listing: 5
- Supported formats: JPG, PNG, WebP
- Auto-compression: 85% quality
- Auto-resize: 1200x800px (maintains aspect ratio)

**Folder Structure:**

```text

RentSphere Images/
├── Listing_1_Image_1.jpg
├── Listing_1_Image_2.jpg
├── Listing_2_Image_1.jpg
└── ...

```text

### Public Access

**Permissions:**

- All uploaded images have public read access
- Accessible via: `https://drive.google.com/uc?id={fileId}`

---

<a id="troubleshooting"></a>

## Troubleshooting

### Common Issues

### Common Issues

#### 1. Database Connection Fails

```bash

Error: connect ECONNREFUSED

```text

**Solution:**

- Check `DATABASE_URL` in `.env`
- Verify Neon database is active
- Test connection: `node setup/test-connection.js`

#### 2. Google Drive Upload Fails

```bash

Error: invalid_grant

```text

**Solution:**

- Refresh token expired
- Regenerate: `node services/get-refresh-token.js`
- Update `GOOGLE_REFRESH_TOKEN` in `.env`

#### 3. Delivery Status Not Updating

```bash

Status stuck at 'shipped'

```text

**Solution:**

- Check `expected_en_route_at` and `expected_delivered_at` are set
- Verify simulation endpoint is being polled
- Check system time is correct
- Wait for expected time to pass

#### 4. Modals Not Showing

```bash

Modal renders but not visible

```text

**Solution:**

- Ensure modal is rendered outside container divs
- Use React Fragment wrapper: `<> </>`
- Check z-index in CSS (should be high, e.g., 1000)

#### 5. Session Lost on Refresh

```bash

User logged out after page refresh

```text

**Solution:**

- Check session store is configured
- Verify `SESSION_SECRET` is set
- Check cookie settings (httpOnly, secure in production)

### Development Tools

**Reset Delivery Data:**

```bash

node setup/reset-delivery-payments.js

```text

Resets all delivery-related fields back to `approved` status for retesting.

**Check Database Structure:**

```bash

node setup/test-connection.js

```text

**Rebuild Frontend:**

```bash

cd client
npm run build

```text

### Performance Tips

1. **Database Indexes**
   - Add indexes on frequently queried columns:
     - `listings.user_id`
     - `rental_requests.renter_id`
     - `rental_requests.delivery_status`

2. **Image Optimization**
   - Always use compressed images
   - Lazy load images in grid views
   - Use thumbnail URLs for list views

3. **Query Optimization**
   - Use JOIN instead of multiple queries
   - Limit results with pagination
   - Cache frequently accessed data

---

<a id="testing-guide"></a>

## Testing Guide

### Testing Rental Flow (Renter)

1. **Browse & Book**
   - Navigate to Browse page
   - Select a listing
   - Click "Request to Rent"
   - Fill in dates and message
   - Submit request

2. **Track Delivery**
   - Owner approves request
   - Click "Choose Delivery Option"
   - Select delivery, enter address
   - Click "Proceed to Payment"
   - Make payment (rental + delivery + platform fee)
   - Click "Track Delivery" to see status

3. **Return & Rate**
   - After delivery shows "delivered"
   - Click "Return Item"
   - Submit delivery rating (speed, condition, communication)
   - Submit owner rating

### Testing Lister Flow (Owner)

1. **Confirm Pickup**
   - Go to "My Listing Requests"
   - See incoming requests
   - Approve/deny requests
   - Track delivery status for approved rentals

2. **Rate Renter**
   - After item is returned
   - Submit rating for renter experience

### Testing Scenarios

**Scenario 1: Nearby Delivery (< 10km)**


- Expected delivery time: 3-4 hours
- Low delivery cost

**Scenario 2: Far Delivery (> 50km)**


- Expected delivery time: 10-12 hours
- Higher delivery cost

**Scenario 3: Self-Pickup**


- No delivery cost
- No tracking needed

---

<a id="license"></a>

## License

MIT License - see [LICENSE](LICENSE) file

---

**Last Updated:** December 2024
**Version:** 1.0.0
````
