# Backend Setup Instructions

## Installation

```bash
npm install
```

## Environment Configuration

The `.env` file is already configured with your database credentials:

```
PORT=5000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=rakshu@123
DB_NAME=sih
DB_PORT=3306
```

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5000`

## Testing the API

### Health Check

```bash
curl http://localhost:5000/api/health
```

### Get All Batches

```bash
curl http://localhost:5000/api/batches
```

### Get AMU Records for Batch

```bash
curl http://localhost:5000/api/amu/1
```

### Generate QR Code

```bash
curl http://localhost:5000/api/qr/1
```

### Verify Batch

```bash
curl http://localhost:5000/api/verify/1
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/batches` - Get all batches
- `GET /api/batches/:id` - Get batch by ID
- `GET /api/amu/:batch_id` - Get AMU records by batch ID
- `GET /api/qr/:batch_id` - Generate QR code for batch
- `GET /api/verify/:batch_id` - Get complete verification data

## Database Connection

The backend connects to your existing MySQL database `sih` using the credentials in `.env`. Make sure:

1. MySQL server is running
2. Database `sih` exists
3. Required tables exist (batches, amu_records, mrl_table, qr_records, tamper_proof_log, farmers, farms)

## Dependencies

- express - Web framework
- mysql2 - MySQL client
- dotenv - Environment variables
- cors - CORS middleware
- body-parser - Request body parser
- qrcode - QR code generation
- crypto - SHA-256 hashing (built-in)

## Troubleshooting

### Database Connection Failed

- Verify MySQL is running
- Check credentials in `.env`
- Ensure database `sih` exists

### Port Already in Use

- Change PORT in `.env` to another port (e.g., 5001)
- Kill process using port 5000: `netstat -ano | findstr :5000`
