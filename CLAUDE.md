# AasaanApp — Project Config

## Deployment URLs
- Railway Backend: https://aasaanappcomv1-production.up.railway.app
- Vercel Frontend: https://aasaan-app-com-v1.vercel.app
- GitHub Repo: https://github.com/arjunkg452545/AasaanApp.com_V1

## Database
- MongoDB Public URL: mongodb://mongo:TRcpvlbysZyDvBOjtPOaNPrAxmSjKlUn@trolley.proxy.rlwy.net:25678
- DB Name: aasaanapp_prod

## SMTP (Railway env vars)
- SMTP_HOST: smtp.hostinger.com
- SMTP_PORT: 465
- SMTP_EMAIL: otp@aasaanapp.com
- SMTP_PASSWORD: set in Railway dashboard only, NEVER in code

## Developer Account
- Email: arjun@saiinfratel.in
- Mobile: 9893452545

## Test Credentials
- Test ED: 9999900001 / Test@1234
- Test President: 9999900003 / Test@1234
- Test Member: 9999900006 / Test@1234
- Test Accountant: 9999900008 / Test@1234
- Test Chapter: CH20260226014957 "BNI Sunrise Test Chapter"

## Running Locally
- Backend: `cd backend && python3 -m uvicorn server:app --reload --port 8000`
- Frontend: `cd frontend && npx craco start`
- Env: backend/.env must have MONGO_URL and DB_NAME
