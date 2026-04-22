# RacingGarage

Full-stack racing team management app — ASP.NET Core 10 API + React/Vite frontend.

---

## 1 - Database

Create an empty MySQL database and a user, or use the defaults already in `appsettings.json`:

```
server=localhost  port=3306  database=racing_garage  user=root  password=root
```

To use different credentials, edit `RacingGarage/appsettings.json`:

```json
"ConnectionStrings": {
  "Default": "server=localhost;port=3306;database=racing_garage;user=YOUR_USER;password=YOUR_PASSWORD;"
}
```

---

## 2 - JWT key

The JWT signing key is read from `RacingGarage/appsettings.Development.json`, which is **not committed** to source control. Create the file if it doesn't exist:

```json
{
  "Jwt": {
    "Key": "YOUR_SECRET_KEY_MIN_32_CHARS_LONG",
    "Issuer": "RacingGarageAPI",
    "Audience": "RacingGarageClient"
  }
}
```

---

## 3 - Backend

```bash
cd RacingGarage

# Restore dependencies
dotnet restore

# Run (applies migrations + seeds demo data automatically)
dotnet run --project RacingGarage
```

The API starts at **http://localhost:5164**.  
Swagger UI is available at **http://localhost:5164/swagger**.

> On first run in Development mode the app runs all EF Core migrations and seeds roles, test users, and demo data automatically — no manual steps needed.

---

## 4 - Frontend

```bash
cd RacingGarageView

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app opens at **http://localhost:5173**.

> The frontend expects the API at `http://localhost:5164`. This is set in `RacingGarageView/.env` via `VITE_API_BASE_URL`.

---

## Demo accounts

| Role        | Email             | Password     |
| ----------- | ----------------- | ------------ |
| Manager     | manager@test.com  | Manager123!  |
| Mechanic    | mechanic@test.com | Mechanic123! |
| Driver      | driver@test.com   | Driver123!   |
| Parts Clerk | parts@test.com    | Parts123!    |

---

## Running tests

**Backend**

```bash
cd RacingGarage
dotnet test
```

**Frontend**

```bash
cd RacingGarageView
npm test
```

---

## Re-seeding

The seeder runs once and skips if data already exists. To start fresh, drop and recreate the database, then restart the API.
