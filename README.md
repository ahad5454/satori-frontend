# Satori Lab Tests Frontend

A modern React application for displaying laboratory test services, categories, and pricing information.

## Features

- 🧪 **Service Categories**: Browse different lab service categories
- 📊 **Test Details**: View individual tests within each category
- ⏱️ **Turnaround Times**: See pricing for different turnaround options
- 💰 **Dynamic Pricing**: Color-coded pricing based on urgency
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API running on http://localhost:8000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Environment Configuration

The app uses the following environment variables:

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:8000)

## Project Structure

```
src/
├── components/
│   ├── LabTests.js          # Main lab tests component
│   └── LabTests.css         # Styles for lab tests
├── services/
│   └── api.js               # API service for backend communication
├── App.js                   # Main app component
├── App.css                  # Global styles
└── index.js                 # App entry point
```

## API Integration

The frontend communicates with the backend through the following endpoints:

- `GET /lab-fees/` - Fetch all lab fees data (categories, tests, rates)
- `POST /lab-fees/seed` - Seed sample data

## Features Overview

### Service Categories
- PCM Air Analysis Services
- TEM Air
- PLM - Bulk Building Materials

### Test Types
- NIOSH 7400
- AHERA (40 CFR, Part 763)
- EPA Level II
- NIOSH 7402
- EPA/600/R-93/116 variants

### Turnaround Times
- 3 hr (Urgent - Red)
- 6 hr (Same Day - Orange)
- 24 hr (Next Day - Yellow)
- 48 hr, 72 hr, 96 hr, 1 Wk (Standard - Green)

## Styling

The application uses:
- CSS Grid and Flexbox for layouts
- CSS Custom Properties for theming
- Smooth transitions and hover effects
- Responsive design patterns
- Modern gradient backgrounds

## Development

To modify the application:

1. Edit components in `src/components/`
2. Update styles in corresponding `.css` files
3. Modify API calls in `src/services/api.js`
4. Test changes in the browser (hot reload enabled)

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `build/` folder.