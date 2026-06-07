# Uber Java Full Stack Demo Guide

## 1. Project Start

This is a full-stack Uber-style ride booking app. The backend is Spring Boot, the frontend is a React app served as static files by the backend, and H2 is used as the local SQL database.

Start the project from the root folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-app.ps1
```

Open the app:

```text
http://localhost:8081
```

Demo logins:

```text
Rider:  9000000001 / password
Driver: 9000000101 / password
```

## 2. High-Level Architecture

The request flow is:

```text
Browser React UI
  -> Spring Boot REST Controller
  -> Service layer business logic
  -> Spring Data JPA repository
  -> H2 database
  -> WebSocket event back to browser
```

Important folders:

```text
frontend/                          React UI, CSS, map assets, vendor libraries
backend/src/main/java/.../config   startup data, auth interceptor, WebSocket config
backend/src/main/java/.../controller REST endpoints
backend/src/main/java/.../service  business logic
backend/src/main/java/.../model    database entities and enums
backend/src/main/java/.../dto      request/response objects
backend/src/main/java/.../repository JPA database access
```

## 3. Startup and Seed Data

`UberJavaFullStackApplication` starts Spring Boot.

`DataSeeder` runs at startup. If the database is empty, it creates one rider and four drivers for Bike, Auto, Cab, and SUV. This makes the demo ready immediately without manual database setup.

`application.properties` sets port `8081`, configures the file-based H2 database, enables the H2 console, and serves the frontend from Spring Boot.

## 4. Authentication

`AuthApiController` exposes:

```text
POST /api/auth/signup
POST /api/auth/login
```

`AuthService.signup()` creates a new rider or driver. If the user signs up as a driver, it also creates a `DriverProfile` with vehicle details.

`AuthService.login()` checks phone, role, and password. For drivers, it refreshes duty status and makes the driver available if they are within the daily limit.

`TokenService` creates and verifies signed HMAC bearer tokens. After login, the frontend sends:

```text
Authorization: Bearer <token>
```

`AuthInterceptor` protects `/api/**` routes except login and signup.

## 5. Rider Flow

The rider selects pickup and destination in the React UI. `PlaceInput` uses Nominatim search, and `MapPanel` uses Leaflet plus OSRM routing to show the route.

`GET /api/fare-estimates` calls `RideService.estimate()`. It calculates distance using `GeoService.distanceKm()` and returns fare options for Bike, Auto, Cab, and SUV.

`POST /api/rides` calls `RideService.requestRide()`. It stores the ride as `REQUESTED`, calculates fare and distance, and broadcasts a WebSocket update.

The rider can then watch status updates: requested, accepted, in progress, completed, paid, and rated.

## 6. Driver Flow

The driver dashboard calls:

```text
GET /api/drivers/{driverId}/requests
GET /api/drivers/{driverId}/rides
```

`RideService.pendingForDriver()` shows only requests matching the driver's vehicle type and sorts them by nearest pickup.

`PATCH /api/rides/{id}/accept` calls `RideService.acceptRide()`. It checks the ride is still requested, the driver is available, vehicle type matches, and the driver has not crossed the 10-hour limit. It assigns the driver and creates a ride OTP.

`PATCH /api/rides/{id}/start` calls `RideService.startRide()`. The driver must enter the OTP shown to the rider, then the status becomes `IN_PROGRESS`.

`PATCH /api/rides/{id}/progress` calls `RideService.updateProgress()`. Each click moves the simulated trip forward. When progress reaches 100%, the ride is completed.

## 7. Payment, Wallet, and Rating

`PATCH /api/rides/{id}/pay` validates the selected payment method and calls `RideService.payRide()`.

For wallet payments, the rider must have enough balance. The fare is debited from the rider, credited to the driver, and saved as `PaymentTransaction` records.

`POST /api/users/{id}/wallet/topup` adds money to the wallet after validating card or UPI details.

`GET /api/users/{id}/transactions` returns transaction history for the wallet screen.

`PATCH /api/rides/{id}/rate` calls `RideService.rateRide()`. It updates the driver's average rating and rating count.

## 8. Live Updates

The frontend connects to:

```text
ws://localhost:8081/ws/rides?token=<token>
```

`RideWebSocketHandler` verifies the token and keeps active WebSocket sessions.

`RideEventPublisher.rideChanged()` broadcasts ride updates whenever a ride is requested, accepted, started, progressed, completed, paid, cancelled, or rated.

This is why rider and driver screens update without manually refreshing the browser.

## 9. What to Say During the Demo

1. "This project is a Java full-stack Uber clone using Spring Boot, React, JPA, H2, REST APIs, and WebSockets."
2. "The app starts with seed data, so we already have one rider and multiple drivers with different vehicle types."
3. "The rider logs in, searches pickup and destination, sees fare estimates, chooses a vehicle, and requests a ride."
4. "The driver logs in and sees matching requests sorted by pickup distance and driver availability."
5. "When the driver accepts, the system generates an OTP. The ride cannot start until the driver enters the rider's OTP."
6. "Live tracking is simulated by progress updates, and every important ride change is pushed through WebSocket."
7. "After completion, the rider pays by wallet, UPI, card, or cash. Wallet payments debit the rider and credit the driver."
8. "Finally, the rider rates the driver, and the driver's rating is recalculated."

## 10. Demo Order

1. Start the app and open `http://localhost:8081`.
2. Login as rider.
3. Choose pickup and destination.
4. Select a vehicle and request a ride.
5. Logout and login as driver.
6. Accept the request.
7. Login as rider again and show the OTP.
8. Login as driver and start the ride with the OTP.
9. Click live tracking until completed.
10. Login as rider, pay, view receipt, and rate the driver.
