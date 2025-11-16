# Frontend Setup Instructions

## Installation

```bash
npm install
```

## Environment Configuration

The `.env` file is configured to connect to the backend:

```
REACT_APP_API_URL=http://localhost:5000/api
```

## Running the Application

```bash
npm start
```

The application will start on `http://localhost:3000`

## Pages

1. **Homepage** (`/`) - Landing page with feature overview
2. **Batch List** (`/batches`) - View all farm batches
3. **QR Generator** (`/qr-generator`) - Generate QR codes for batches
4. **QR Verification** (`/verify`) - Verify batch compliance and safety

## Features

### Homepage

- Overview of the system
- Information about AMU, MRL, and traceability
- Quick navigation to all features

### Batch List

- View all batches from database
- Search functionality
- Quick links to verification and QR generation

### QR Generator

- Select batch from dropdown or enter manually
- Generate QR code as Base64 image
- Download QR code
- Test verification link

### QR Verification

- Enter batch ID or scan QR code
- View batch details (species, breed, matrix)
- See all AMU records (antibiotics used)
- Withdrawal period status (PASS/FAIL)
- ML risk prediction
- Tamper-proof verification

## API Integration

The frontend uses Axios to communicate with the backend:

- `GET /api/batches` - Fetch all batches
- `GET /api/qr/:batch_id` - Generate QR code
- `GET /api/verify/:batch_id` - Verify batch

## QR Code Workflow

1. User navigates to QR Generator
2. Selects a batch ID
3. QR code is generated (contains verification URL)
4. User downloads QR code
5. When scanned, QR redirects to: `/verify?batch_id=X`
6. Verification page loads batch data and displays:
   - Batch information
   - All antibiotic usage records
   - Withdrawal period calculation
   - PASS/FAIL status
   - ML risk prediction
   - Tamper-proof verification

## Styling

- Responsive design for mobile and desktop
- Gradient backgrounds for visual appeal
- Color-coded status indicators (green = PASS, red = FAIL)
- Clean card-based layout

## Dependencies

- react - UI library
- react-router-dom - Routing
- axios - HTTP client

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `build/` folder.

## Troubleshooting

### Can't Connect to Backend

- Ensure backend is running on port 5000
- Check `REACT_APP_API_URL` in `.env`
- Check browser console for CORS errors

### QR Code Not Generating

- Verify batch exists in database
- Check network tab for API errors
- Ensure backend QR route is working
