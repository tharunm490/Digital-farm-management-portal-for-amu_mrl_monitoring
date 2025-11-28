@echo off
echo === Testing Treatment Workflow ===
echo.

echo 1. Logging in as farmer...
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"farmer@test.com\",\"password\":\"farmer123\"}" > login_response.json
echo Done. Check login_response.json for token.
echo.

echo 2. Please extract the token from login_response.json and run the following commands manually:
echo.
echo SET TOKEN=your_token_here
echo.
echo curl -X GET http://localhost:5000/api/amu -H "Authorization: Bearer %TOKEN%"
echo.
echo curl -X GET http://localhost:5000/api/notifications -H "Authorization: Bearer %TOKEN%"
echo.
pause
