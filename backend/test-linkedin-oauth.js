require('dotenv').config();
const axios = require('axios');

// Test LinkedIn OAuth token endpoint with your credentials
async function testLinkedInOAuth() {
  const testCode = 'test_code'; // This will fail but show us the exact error
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: testCode,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI
  });

  console.log('🔧 Testing LinkedIn OAuth with credentials:');
  console.log('- Client ID:', process.env.LINKEDIN_CLIENT_ID);
  console.log('- Client Secret:', process.env.LINKEDIN_CLIENT_SECRET ? `${process.env.LINKEDIN_CLIENT_SECRET.substring(0, 10)}...` : 'MISSING');
  console.log('- Redirect URI:', process.env.LINKEDIN_REDIRECT_URI);
  
  try {
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Error details:');
    console.log('- Status:', error.response?.status);
    console.log('- Data:', error.response?.data);
    console.log('- Headers:', error.response?.headers);
  }
}

testLinkedInOAuth();
