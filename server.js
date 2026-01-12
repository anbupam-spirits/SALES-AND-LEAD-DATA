const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Multer Setup for Image Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Google Sheets Setup
const SPREADSHEET_ID = '13lu_sv8Ssr84skJaJFpUFlUEftIXzmZDMi9sP9qIToM';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function appendToSheet(data) {
  const KEY_FILE_PATH = path.join(__dirname, 'service-account.json');
  
  if (!fs.existsSync(KEY_FILE_PATH)) {
    throw new Error('service-account.json not found. Please add your Google Service Account key file.');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Columns:
  // Timestamp, SR Name, Store Name, Visit Type, Category, Phone, Lead Type, Follow Up Date, 
  // Image URL, Products, Order Details, Loc Yes/No, Lat, Long, Loc Link, Remarks
  
  const values = [
    [
      new Date().toLocaleString(),
      data.srName,
      data.storeName,
      data.visitType,
      data.category,
      data.phone,
      data.leadType,
      data.followUpDate,
      data.imageUrl,
      data.products, // Already comma separated string or join it
      data.orderDetails,
      data.locationRecorded,
      data.latitude,
      data.longitude,
      data.locationLink,
      data.remarks
    ]
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A:P', // Assuming Sheet1 and first 16 columns
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: values,
    },
  });
}

// API Endpoint
app.post('/api/submit', upload.single('photograph'), async (req, res) => {
  try {
    const body = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Photograph is required.' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

    const formData = {
      srName: body.srName,
      storeName: body.storeName,
      visitType: body.visitType,
      category: body.category,
      phone: body.phone,
      leadType: body.leadType,
      followUpDate: body.followUpDate,
      imageUrl: imageUrl,
      products: body.products, // Will be sent as string from frontend or JSON
      orderDetails: body.orderDetails,
      locationRecorded: body.locationRecorded,
      latitude: body.latitude,
      longitude: body.longitude,
      locationLink: body.locationLink,
      remarks: body.remarks
    };

    console.log('Received submission:', formData);

    await appendToSheet(formData);

    res.json({ success: true, message: 'Data submitted successfully!' });

  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
