import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

/*
 * Retell AI instant callback handler
 *
 * This server exposes a single POST endpoint, `/lead-capture`, which accepts a
 * phone number from a landing page, then calls the Retell AI API to initiate
 * an outbound phone call from your configured Retell number to the provided
 * destination number. The Retell agent ID and phone number are hard‑coded
 * below for simplicity; update these constants as needed. The API key is
 * provided via environment variables (see .env). If the call is successfully
 * registered, the endpoint responds with the Retell API response. On error,
 * a 500 status and error details are returned.
 */

// Constants: update these with your own Retell details
const AGENT_ID = 'agent_942e5a52722eb61774d4ec367d';
const FROM_NUMBER = '+15072676898';

// Base URL for Retell AI API
const RETELL_BASE_URL = 'https://api.retellai.com';

/**
 * POST /lead-capture
 * Expected body parameters (JSON or form‑encoded):
 *   - phone or phoneNumber: destination number in E.164 format (e.g. +15551234567)
 *
 * The endpoint attempts to initiate an outbound call using Retell AI. It
 * validates the input, then sends a POST request to `/v2/create-phone-call` on
 * the Retell API. The API key is sent in the Authorization header. If the
 * request succeeds, the response body from Retell is returned. Otherwise,
 * errors are logged and a descriptive message is sent to the client.
 */
app.post('/lead-capture', async (req, res) => {
  try {
    // Accept phone number from various common field names
    const phoneNumber = req.body.phone || req.body.phoneNumber || req.query.phone || req.query.phoneNumber;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Prepare payload for Retell API
    const payload = {
      from_number: FROM_NUMBER,
      to_number: phoneNumber,
      agent_id: AGENT_ID,
    };

    // Send request to Retell API
    const response = await axios.post(`${RETELL_BASE_URL}/v2/create-phone-call`, payload, {
      headers: {
        'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // Return the Retell API response to the client
    return res.json({ success: true, data: response.data });
  } catch (error) {
    // Capture error information for troubleshooting
    const status = error.response?.status || 500;
    const details = error.response?.data || { message: error.message };
    console.error('Retell API error:', details);
    return res.status(status).json({ error: 'Failed to create phone call', details });
  }
});

// Health check route to verify server is running
app.get('/', (req, res) => {
  res.send('Retell callback server is running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});