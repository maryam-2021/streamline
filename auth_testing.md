# Auth Testing Playbook (Emergent Google Auth + JWT)

## JWT auth testing
```
curl -c cookies.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@streamline.app","password":"StreamAdmin#2026"}'
curl -b cookies.txt $API/api/auth/me
```

## Emergent Google Auth-gated testing

Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  role: 'client',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
"
```

Step 2: Test Backend API
```
curl -X GET "$API/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "$API/api/workflows" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Step 3: Browser Testing
```
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "<preview-domain>",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
}]);
```

Cleanup:
```
mongosh --eval "use('test_database'); db.users.deleteMany({email: /test\.user\./}); db.user_sessions.deleteMany({session_token: /test_session/});"
```
