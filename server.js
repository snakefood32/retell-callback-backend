import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

// Retrieve credentials from environment variables or fallback to hard‑coded values.
// In production, you should prefer environment variables to avoid exposing
// secrets in your source code. The values below serve as sensible defaults
// based on the credentials provided by the user for local testing.
const RETELL_API_KEY  = process.env.RETELL_API_KEY  || 'key_493977fa5d53a9f3989740ae8ac0';
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID || 'agent_942e5a52722eb61774d4ec367d';
const RETELL_FROM_NUM = process.env.RETELL_FROM_NUM || '+15072676898';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and enable CORS
app.use(cors());
app.use(express.json());

/**
 * Helper function to convert a phone number to E.164 format.
 * It strips all non‑digit characters, prefixes with country code if necessary,
 * and returns the number with a leading '+'.
 *
 * @param {string} phone Raw phone number from client
 * @returns {string} Phone number formatted as E.164
 */
function formatToE164(phone) {
  let digits = (phone || '').replace(/\D/g, '');
  // Prepend US country code if missing
  if (!digits.startsWith('1') && digits.length === 10) {
    digits = '1' + digits;
  }
  return '+' + digits;
}

/**
 * POST /lead-capture
 * Expects body: { phone, name, case_type, landing_page, utm_source, utm_campaign }
 * Initiates an outbound call using the Retell AI API and returns a success
 * message to the client. On error, returns an error message.
 */
app.post('/lead-capture', async (req, res) => {
  const { phone, name, case_type, landing_page, utm_source, utm_campaign } = req.body || {};

  if (!phone) {
    return res.status(400).json({ status: 'error', error: 'Phone number is required' });
  }

  const toNumber = formatToE164(phone);

  try {
    // Compose request payload for Retell API
    const payload = {
      from_number: RETELL_FROM_NUM,
      to_number: toNumber,
      override_agent_id: RETELL_AGENT_ID,
      // Optional metadata fields for analytics or customization
      metadata: {
        landing_page: landing_page || null,
        case_type:    case_type    || null,
        utm_source:   utm_source   || null,
        utm_campaign: utm_campaign || null,
      },
      // Dynamic variables to personalize the AI agent's script
      retell_llm_dynamic_variables: {
        lead_name:      name      || '',
        lead_phone:     phone,
        lead_case_type: case_type || 'mass tort',
        lead_source:    landing_page || utm_source || 'website',
        utm_campaign:   utm_campaign || '',
      },
    };

    await axios.post(
      'https://api.retellai.com/v2/create-phone-call',
      payload,
      {
        headers: {
          Authorization: `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return res.status(200).json({ status: 'success', message: "We're calling you now! Please pick up." });
  } catch (error) {
    console.error('Error initiating Retell call:', error?.response?.data || error?.message);
    return res.status(500).json({ status: 'error', error: 'Failed to initiate call' });
  }
});

// Basic health check endpoint
app.get('/', (_, res) => {
  res.json({ status: 'ok', message: 'Retell callback backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
