# BiblioDrop — Server

REST API backend for BiblioDrop online book delivery platform.

## Live URL
[your-deployed-api-url]

## Key Features
- JWT authentication via httpOnly cookies
- Google OAuth support
- Role-based route protection (user / librarian / admin)
- Stripe payment integration with webhook verification
- Verified review system — checks delivered order before allowing review
- Server-side pagination and filtering for books
- MongoDB Atlas with Mongoose ODM

## NPM Packages
| Package | Purpose |
|---|---|
| express | Web framework |
| mongoose | MongoDB ODM |
| dotenv | Environment variables |
| cors | Cross-origin resource sharing |
| cookie-parser | Parse JWT from cookies |
| jsonwebtoken | JWT generation and verification |
| bcryptjs | Password hashing |
| stripe | Payment processing |
| morgan | HTTP request logging |

## Environment Variables
```
PORT=
MONGODB_URI=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CLIENT_URL=
NODE_ENV=
```

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/google
- GET /api/books
- GET /api/books/:id
- POST /api/books
- PUT /api/books/:id
- DELETE /api/books/:id
- PATCH /api/books/:id/toggle-publish
- GET /api/books/librarian/my-books
- GET /api/orders/my-orders
- GET /api/orders/librarian-orders
- GET /api/orders/check-delivered
- PATCH /api/orders/:id/status
- GET /api/orders/all
- GET /api/reviews/book/:bookId
- GET /api/reviews/my-reviews
- POST /api/reviews
- PUT /api/reviews/:id
- DELETE /api/reviews/:id
- GET /api/wishlist
- POST /api/wishlist
- DELETE /api/wishlist/:bookId
- GET /api/users/profile
- PUT /api/users/profile
- GET /api/admin/users
- PATCH /api/admin/users/:id/role
- DELETE /api/admin/users/:id
- GET /api/admin/books/pending
- PATCH /api/admin/books/:id/approve
- PATCH /api/admin/books/:id/unpublish
- DELETE /api/admin/books/:id
- GET /api/admin/transactions
- GET /api/admin/analytics
- POST /api/stripe/create-checkout-session
- POST /api/stripe/webhook
