# Cross-Domain User Management API

This API is intended for **server-to-server** communication only.  
The other domain's backend calls these endpoints to manage users on this domain.  
No JWT token is required — authentication is done via a shared secret key in the request header.

---

## Base URL

```
http://<this-domain-host>:3003
```

---

## Authentication

Every request **must** include the following header:

```
x-cross-domain-key: <CROSS_DOMAIN_API_KEY>
```

The value must match the `CROSS_DOMAIN_API_KEY` environment variable set on this server.  
Requests without this header, or with an incorrect key, will receive a `401 Unauthorized` response.

### How to set the key on this server (.env)

```env
CROSS_DOMAIN_API_KEY=your-strong-shared-secret
```

### How to call from the other domain (Node.js / axios example)

```js
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://<this-domain-host>:3003',
  headers: {
    'x-cross-domain-key': process.env.CROSS_DOMAIN_API_KEY,
    'Content-Type': 'application/json',
  },
});
```

---

## Important Note on OTP

Users created through this API are automatically marked as **email verified**.  
This means when they log in on the main domain, they will **not** be asked for an OTP verification code.

---

## Endpoints

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | `GET` | `/cross-domain/users` | Get all users (paginated) |
| 2 | `POST` | `/cross-domain/users` | Create a new user |
| 3 | `DELETE` | `/cross-domain/users/:id` | Delete a user |
| 4 | `PATCH` | `/cross-domain/users/:id/change-password` | Change user password |

---

### 1. Get All Users

**GET** `/cross-domain/users`

Returns a paginated list of all users. Passwords are never included in the response.

#### Request Headers

| Header               | Required | Value             |
|----------------------|----------|-------------------|
| `x-cross-domain-key` | Yes      | Shared secret key |

#### Query Parameters

| Param    | Type   | Default | Description                        |
|----------|--------|---------|------------------------------------|
| `page`   | number | `1`     | Page number                        |
| `limit`  | number | `10`    | Results per page (max 100)         |
| `search` | string | —       | Filter by name or email (optional) |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "a3f2c1d4-58e6-4b3a-9c1f-2d7e8b0a4f91",
        "email": "john@example.com",
        "name": "John Doe",
        "plan": "PRO",
        "provider": "LOCAL",
        "providerId": null,
        "avatarUrl": null,
        "isActive": true,
        "emailVerified": true,
        "emailVerifiedAt": "2026-06-10T07:30:00.000Z",
        "createdAt": "2026-06-10T07:30:00.000Z",
        "updatedAt": "2026-06-10T07:30:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "totalPages": 5
  }
}
```

#### Error Responses

| Status | Scenario                 | Response Body                                              |
|--------|--------------------------|------------------------------------------------------------|
| `401`  | Wrong or missing API key | `{ "statusCode": 401, "message": "Invalid or missing cross-domain API key." }` |

#### Axios Example

```js
// Get page 1 with default limit
const response = await client.get('/cross-domain/users');

// With pagination and search
const response = await client.get('/cross-domain/users', {
  params: { page: 2, limit: 20, search: 'john' },
});

const { users, total, page, totalPages } = response.data.data;
```

---

### 2. Create User

**POST** `/cross-domain/users`

Creates a new user. The password is bcrypt-hashed on the server. The user is created with `emailVerified: true` so no OTP is triggered on login.

#### Request Headers

| Header               | Required | Value                        |
|----------------------|----------|------------------------------|
| `x-cross-domain-key` | Yes      | Shared secret key            |
| `Content-Type`       | Yes      | `application/json`           |

#### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Str0ngP@ssword"
}
```

| Field      | Type   | Required | Validation              |
|------------|--------|----------|-------------------------|
| `name`     | string | Yes      | Non-empty string        |
| `email`    | string | Yes      | Valid email format      |
| `password` | string | Yes      | Minimum 8 characters    |

#### Success Response — `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "a3f2c1d4-58e6-4b3a-9c1f-2d7e8b0a4f91",
    "email": "john@example.com",
    "name": "John Doe",
    "plan": "PRO",
    "provider": "LOCAL",
    "providerId": null,
    "avatarUrl": null,
    "isActive": true,
    "emailVerified": true,
    "emailVerifiedAt": "2026-06-10T07:30:00.000Z",
    "createdAt": "2026-06-10T07:30:00.000Z",
    "updatedAt": "2026-06-10T07:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Scenario                  | Response Body                                              |
|--------|---------------------------|------------------------------------------------------------|
| `400`  | Missing / invalid fields  | `{ "success": false, "message": "...", "errors": [...] }` |
| `401`  | Wrong or missing API key  | `{ "statusCode": 401, "message": "Invalid or missing cross-domain API key." }` |
| `409`  | Email already registered  | `{ "statusCode": 409, "message": "Email already registered" }` |

#### Axios Example

```js
const response = await client.post('/cross-domain/users', {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'Str0ngP@ssword',
});

const newUser = response.data.data;
console.log(newUser.id); // store this ID for future calls
```

---

### 3. Delete User

**DELETE** `/cross-domain/users/:id`

Permanently deletes a user by their UUID.

#### Request Headers

| Header               | Required | Value             |
|----------------------|----------|-------------------|
| `x-cross-domain-key` | Yes      | Shared secret key |

#### URL Parameter

| Param | Type   | Description          |
|-------|--------|----------------------|
| `id`  | UUID   | The user's unique ID |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "User deleted successfully."
}
```

#### Error Responses

| Status | Scenario                 | Response Body                                              |
|--------|--------------------------|------------------------------------------------------------|
| `400`  | `id` is not a valid UUID | `{ "statusCode": 400, "message": "Validation failed (uuid is expected)" }` |
| `401`  | Wrong or missing API key | `{ "statusCode": 401, "message": "Invalid or missing cross-domain API key." }` |
| `404`  | User not found           | `{ "statusCode": 404, "message": "User not found." }` |

#### Axios Example

```js
const userId = 'a3f2c1d4-58e6-4b3a-9c1f-2d7e8b0a4f91';

const response = await client.delete(`/cross-domain/users/${userId}`);
console.log(response.data.message); // "User deleted successfully."
```

---

### 4. Change Password

**PATCH** `/cross-domain/users/:id/change-password`

Directly updates the user's password (bcrypt-hashed). No OTP or current password required — this is a trusted server-to-server call.

#### Request Headers

| Header               | Required | Value                        |
|----------------------|----------|------------------------------|
| `x-cross-domain-key` | Yes      | Shared secret key            |
| `Content-Type`       | Yes      | `application/json`           |

#### URL Parameter

| Param | Type   | Description          |
|-------|--------|----------------------|
| `id`  | UUID   | The user's unique ID |

#### Request Body

```json
{
  "newPassword": "NewStr0ng@Pass"
}
```

| Field         | Type   | Required | Validation           |
|---------------|--------|----------|----------------------|
| `newPassword` | string | Yes      | Minimum 8 characters |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

#### Error Responses

| Status | Scenario                  | Response Body                                              |
|--------|---------------------------|------------------------------------------------------------|
| `400`  | Missing / invalid fields  | `{ "success": false, "message": "...", "errors": [...] }` |
| `400`  | `id` is not a valid UUID  | `{ "statusCode": 400, "message": "Validation failed (uuid is expected)" }` |
| `401`  | Wrong or missing API key  | `{ "statusCode": 401, "message": "Invalid or missing cross-domain API key." }` |
| `404`  | User not found            | `{ "statusCode": 404, "message": "User not found." }` |

#### Axios Example

```js
const userId = 'a3f2c1d4-58e6-4b3a-9c1f-2d7e8b0a4f91';

const response = await client.patch(`/cross-domain/users/${userId}/change-password`, {
  newPassword: 'NewStr0ng@Pass',
});
console.log(response.data.message); // "Password updated successfully."
```

---

## Complete Integration Example (Other Domain Backend)

```js
// cross-domain-client.js — place this in the other domain backend

const axios = require('axios');

const crossDomainClient = axios.create({
  baseURL: process.env.MAIN_DOMAIN_API_URL, // e.g. http://mailio-backend:3003
  headers: {
    'x-cross-domain-key': process.env.CROSS_DOMAIN_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Get all users (paginated)
async function getUsers({ page = 1, limit = 10, search } = {}) {
  const res = await crossDomainClient.get('/cross-domain/users', {
    params: { page, limit, search },
  });
  return res.data.data; // { users, total, page, totalPages }
}

// Create user
async function createUser(name, email, password) {
  const res = await crossDomainClient.post('/cross-domain/users', { name, email, password });
  return res.data.data; // returns the created user object
}

// Delete user
async function deleteUser(userId) {
  const res = await crossDomainClient.delete(`/cross-domain/users/${userId}`);
  return res.data.message;
}

// Change password
async function changePassword(userId, newPassword) {
  const res = await crossDomainClient.patch(`/cross-domain/users/${userId}/change-password`, {
    newPassword,
  });
  return res.data.message;
}

module.exports = { getUsers, createUser, deleteUser, changePassword };
```

---

## Environment Variables Required

### On This Server (Mailio backend)

```env
CROSS_DOMAIN_API_KEY=your-strong-shared-secret
PORT=3003
```

### On the Other Domain's Server

```env
MAIN_DOMAIN_API_URL=http://<this-server-host>:3003
CROSS_DOMAIN_API_KEY=your-strong-shared-secret   # must match the value above
```

> Keep `CROSS_DOMAIN_API_KEY` the same on both servers. Treat it like a password — use a long random string and never commit it to git.

---

## Error Response Shape Reference

All error responses from NestJS follow this shape:

```json
{
  "statusCode": 400,
  "message": "Human-readable description",
  "error": "Bad Request"
}
```

Validation errors (missing/invalid fields) return an array:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```
