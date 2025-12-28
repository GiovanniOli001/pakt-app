// PAKT License API Worker v3
// Handles Stripe webhooks, license validation, device limiting, and device recovery

const MAX_DEVICES = 3;

// Generate a random license key
function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return 'PAKT-' + segments.join('-');
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // POST /webhook - Stripe webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
      try {
        const payload = await request.text();
        const event = JSON.parse(payload);
        
        // Handle successful payment
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const email = session.customer_email || session.customer_details?.email;
          
          // Generate license key
          const licenseKey = generateLicenseKey();
          
          // Store in KV: key -> { email, createdAt, status, devices: [] }
          await env.PAKT_LICENSES.put(licenseKey, JSON.stringify({
            email: email,
            createdAt: new Date().toISOString(),
            status: 'active',
            stripeSessionId: session.id,
            devices: []
          }));
          
          // Also store email -> key mapping for lookup
          if (email) {
            await env.PAKT_LICENSES.put(`email:${email.toLowerCase()}`, licenseKey);
          }
          
          console.log(`License created: ${licenseKey} for ${email}`);
          
          return new Response(JSON.stringify({ success: true, key: licenseKey }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // POST /activate - Activate license on a device
    if (url.pathname === '/activate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { key, deviceId } = body;
        
        if (!key || !deviceId) {
          return new Response(JSON.stringify({ 
            valid: false, 
            error: 'Missing key or deviceId' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const licenseData = await env.PAKT_LICENSES.get(key);
        
        if (!licenseData) {
          return new Response(JSON.stringify({ 
            valid: false, 
            error: 'Invalid license key' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const data = JSON.parse(licenseData);
        
        if (data.status !== 'active') {
          return new Response(JSON.stringify({ 
            valid: false, 
            error: 'License is not active' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Initialize devices array if not present
        if (!data.devices) {
          data.devices = [];
        }
        
        // Check if device is already activated
        const existingDevice = data.devices.find(d => d.id === deviceId);
        if (existingDevice) {
          existingDevice.lastSeen = new Date().toISOString();
          await env.PAKT_LICENSES.put(key, JSON.stringify(data));
          
          // Also store device -> key mapping for recovery
          await env.PAKT_LICENSES.put(`device:${deviceId}`, key);
          
          return new Response(JSON.stringify({ 
            valid: true, 
            email: data.email,
            licenseKey: key,
            devicesUsed: data.devices.length,
            maxDevices: MAX_DEVICES
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Check device limit
        if (data.devices.length >= MAX_DEVICES) {
          return new Response(JSON.stringify({ 
            valid: false, 
            error: `License already activated on ${MAX_DEVICES} devices. Deactivate a device or contact support.`,
            devicesUsed: data.devices.length,
            maxDevices: MAX_DEVICES
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Add new device
        data.devices.push({
          id: deviceId,
          activatedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
        
        await env.PAKT_LICENSES.put(key, JSON.stringify(data));
        
        // Store device -> key mapping for recovery
        await env.PAKT_LICENSES.put(`device:${deviceId}`, key);
        
        return new Response(JSON.stringify({ 
          valid: true, 
          email: data.email,
          licenseKey: key,
          devicesUsed: data.devices.length,
          maxDevices: MAX_DEVICES
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('Activate error:', error);
        return new Response(JSON.stringify({ valid: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /check-device?deviceId=XXX - Check if device is already activated
    if (url.pathname === '/check-device' && request.method === 'GET') {
      const deviceId = url.searchParams.get('deviceId');
      
      if (!deviceId) {
        return new Response(JSON.stringify({ activated: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Look up device -> key mapping
      const licenseKey = await env.PAKT_LICENSES.get(`device:${deviceId}`);
      
      if (licenseKey) {
        // Verify the license is still valid
        const licenseData = await env.PAKT_LICENSES.get(licenseKey);
        if (licenseData) {
          const data = JSON.parse(licenseData);
          if (data.status === 'active') {
            // Update last seen
            const device = data.devices?.find(d => d.id === deviceId);
            if (device) {
              device.lastSeen = new Date().toISOString();
              await env.PAKT_LICENSES.put(licenseKey, JSON.stringify(data));
            }
            
            return new Response(JSON.stringify({ 
              activated: true,
              licenseKey: licenseKey,
              email: data.email
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      }
      
      return new Response(JSON.stringify({ activated: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /validate?key=XXXX - Simple validation
    if (url.pathname === '/validate' && request.method === 'GET') {
      const key = url.searchParams.get('key');
      
      if (!key) {
        return new Response(JSON.stringify({ valid: false, error: 'No key provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const licenseData = await env.PAKT_LICENSES.get(key);
      
      if (licenseData) {
        const data = JSON.parse(licenseData);
        if (data.status === 'active') {
          return new Response(JSON.stringify({ 
            valid: true, 
            email: data.email,
            devicesUsed: data.devices ? data.devices.length : 0,
            maxDevices: MAX_DEVICES
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /lookup?email=xxx - Lookup by email
    if (url.pathname === '/lookup' && request.method === 'GET') {
      const email = url.searchParams.get('email');
      
      if (!email) {
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const key = await env.PAKT_LICENSES.get(`email:${email.toLowerCase()}`);
      
      if (key) {
        return new Response(JSON.stringify({ found: true, key: key }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /success?session_id=XXX - Success page data
    if (url.pathname === '/success' && request.method === 'GET') {
      const sessionId = url.searchParams.get('session_id');
      
      const keys = await env.PAKT_LICENSES.list();
      
      for (const key of keys.keys) {
        if (!key.name.startsWith('email:') && !key.name.startsWith('device:')) {
          const data = await env.PAKT_LICENSES.get(key.name);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.stripeSessionId === sessionId) {
              return new Response(JSON.stringify({ 
                success: true, 
                licenseKey: key.name,
                email: parsed.email 
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        }
      }
      
      return new Response(JSON.stringify({ success: false, message: 'Processing...' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // POST /deactivate - Remove a device from license
    if (url.pathname === '/deactivate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { key, deviceId } = body;
        
        if (!key || !deviceId) {
          return new Response(JSON.stringify({ success: false, error: 'Missing key or deviceId' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const licenseData = await env.PAKT_LICENSES.get(key);
        
        if (!licenseData) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid license key' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const data = JSON.parse(licenseData);
        
        if (data.devices) {
          data.devices = data.devices.filter(d => d.id !== deviceId);
          await env.PAKT_LICENSES.put(key, JSON.stringify(data));
          // Remove device -> key mapping
          await env.PAKT_LICENSES.delete(`device:${deviceId}`);
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          devicesUsed: data.devices ? data.devices.length : 0,
          maxDevices: MAX_DEVICES
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Default response
    return new Response(JSON.stringify({ 
      service: 'PAKT License API',
      version: 3,
      endpoints: ['/webhook', '/activate', '/validate', '/check-device', '/lookup', '/success', '/deactivate']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
