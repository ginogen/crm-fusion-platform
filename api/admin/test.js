export default function handler(req, res) {
  console.log('🔍 Test endpoint called:', {
    method: req.method,
    url: req.url,
    headers: Object.keys(req.headers)
  });

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Test endpoint working',
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    return res.status(200).json({
      success: true,
      message: 'POST method working',
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
} 