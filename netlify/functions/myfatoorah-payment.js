/**
 * Netlify serverless function — creates a MyFatoorah payment session.
 *
 * Why this exists: MyFatoorah's API key must never be shipped to the
 * browser. The registration form (js/register.js) POSTs the order details
 * here; this function calls MyFatoorah server-side using a secret key read
 * from environment variables, then returns the hosted payment page URL for
 * the browser to redirect to.
 *
 * Setup (see README.md for full instructions):
 *   1. Get your API key from the MyFatoorah merchant portal (test or live).
 *   2. In Netlify: Site settings -> Environment variables, add:
 *        MYFATOORAH_API_KEY   = your secret API key
 *        MYFATOORAH_BASE_URL  = https://apitest.myfatoorah.com   (test)
 *                                https://api.myfatoorah.com       (live)
 *        SITE_URL              = https://your-deployed-domain
 *   3. Deploy. The form on register.html will then complete real payments.
 */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.MYFATOORAH_API_KEY;
  const baseUrl = process.env.MYFATOORAH_BASE_URL || 'https://apitest.myfatoorah.com';
  const siteUrl = process.env.SITE_URL || `https://${event.headers.host}`;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'MyFatoorah is not configured. Set MYFATOORAH_API_KEY in your deployment environment variables.'
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { registrationId, customerName, customerEmail, customerPhone, amount, currency, courseTitle } = payload;

  if (!customerName || !customerEmail || !amount || amount <= 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required registration fields' }) };
  }

  try {
    const mfResponse = await fetch(`${baseUrl}/v2/SendPayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        CustomerName: customerName,
        CustomerEmail: customerEmail,
        CustomerMobile: customerPhone,
        InvoiceValue: amount,
        DisplayCurrencyIso: currency || 'KWD',
        Language: 'en',
        CustomerReference: registrationId,
        InvoiceItems: [
          { ItemName: courseTitle || 'Reemora Course Registration', Quantity: 1, UnitPrice: amount }
        ],
        CallBackUrl: `${siteUrl}/register.html?status=success&ref=${encodeURIComponent(registrationId || '')}`,
        ErrorUrl: `${siteUrl}/register.html?status=failed&ref=${encodeURIComponent(registrationId || '')}`
      })
    });

    const mfData = await mfResponse.json();

    if (!mfResponse.ok || !mfData.IsSuccess) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'MyFatoorah rejected the payment request', details: mfData })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        invoiceUrl: mfData.Data.InvoiceURL,
        invoiceId: mfData.Data.InvoiceId
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unable to reach MyFatoorah', details: String(err) })
    };
  }
};
