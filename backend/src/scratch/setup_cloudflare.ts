import 'dotenv/config';
import axios from 'axios';

const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_ACCOUNT_TOKEN;

async function run() {
  if (!token) {
    console.error('No Cloudflare token found in env');
    return;
  }
  console.log('Testing Cloudflare API...');
  try {
    const res = await axios.get('https://api.cloudflare.com/client/v4/zones', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const zones = res.data?.result || [];
    console.log(`Found ${zones.length} zone(s):`);
    for (const z of zones) {
      console.log(`- ${z.name} (ID: ${z.id}, Status: ${z.status})`);
      
      // Let's check security settings for this zone
      try {
        const settingsRes = await axios.get(`https://api.cloudflare.com/client/v4/zones/${z.id}/settings/security_level`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`  Security Level: ${settingsRes.data?.result?.value}`);
      } catch (e: any) {
        console.log(`  Could not read security level: ${e.response?.data?.errors?.[0]?.message || e.message}`);
      }
    }
  } catch (e: any) {
    console.error('Cloudflare API Error:', e.response?.data || e.message);
  }
}

run();
