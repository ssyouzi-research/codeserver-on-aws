import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';

const env = {
    'URL': 'https://www.googleapis.com/oauth2/v3/certs',
    'CLIENT_ID': 'YOUR-CLIENT-ID.apps.googleusercontent.com',
    'ISSUER': 'https://accounts.google.com',
    'SUBJECT': 'YOUR-SUBJECT'
};

const JWKS = createRemoteJWKSet(
  new URL(env.URL)
);
const issuer = env.ISSUER;
const audience = env.CLIENT_ID;

const subject = env.SUBJECT;

async function verifyOidcTokenWithoutExpireCheck(token) {
  const payload = decodeJwt(token);
  if (payload.iss == issuer && payload.aud == audience && payload.sub == subject) {
    return payload;
  }
  console.error('Token verification failed');
  return false;
}

async function verifyOidcToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      'issuer': issuer,
      'audience': audience
    });

    if (payload.sub != subject) {
      throw new Error(`Invalid subject: ${payload.sub}`);
    }

    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

export const handler = async (event, context, callback) => {
  const request = event.Records[0].cf.request;
  console.log(JSON.stringify(request));
  const uri = request.uri;
  const method = request.method;
  if (uri == '/token' && method == 'GET') {
    const querystring = request.querystring;
    const params = {};
    querystring.split('&').map((param) => {
      const keyValue = param.split('=');
      const key = keyValue[0];
      const value = keyValue[1];
      params[key] = value;
    });
    if (params['jwt_token']) {
      const value = params['jwt_token'];
      const response = {
        'status': '302',
        'statusDescription': 'Found',
        'headers': {
          'location': [{
            'key': 'Location',
            'value': '/'
          }],
          'set-cookie': [{
            'key': 'Set-Cookie',
            'value': `jwt_token=${value}; Path=/; Secure; HttpOnly`
          }]
        }
      };
      const payload = await verifyOidcToken(value);
      if (payload) {
        console.log('Token is valid. Payload:', payload);
        callback(null, response);
        return;
      }
    } else {
      const response = {
        'status': '403',
        'statusDescription': 'Forbidden',
        'headers': {
          'content-type': [{
            'key': 'Content-Type',
            'value': 'text/html'
          }]
        }
      };
      callback(null, response);
      return;
    }
  }

  const cookie = request.headers['cookie'];
  if (cookie) {
    const cookies = cookie[0].value.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const keyValue = cookies[i].split('=');
      const key = keyValue[0].trim();
      const value = keyValue[1].trim();
      if (key == 'jwt_token' && await verifyOidcTokenWithoutExpireCheck(value)) {
        callback(null, request);
        return;
      }
    }
  }

  const response = {
    'status': '403',
    'statusDescription': 'Forbidden',
    'headers': {
      'content-type': [{
        'key': 'Content-Type',
        'value': 'text/html'
      }]
    }
  };
  callback(null, response);
  return;
}
