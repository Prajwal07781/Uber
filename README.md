# Uber Java Full Stack

A full-stack Java Uber-style ride booking application built with Spring Boot, Thymeleaf, Spring Data JPA, and H2.

## Features

- Persistent SQL database for riders, drivers, vehicles, and rides
- Rider and driver seed data for quick demo
- Login and signup for users and drivers
- Correct phone/password authentication
- Driver vehicle registration during signup
- Fare estimation for Bike, Auto, Cab (5 seater), and SUV (7 seater)
- Real map UI with OpenStreetMap and Leaflet
- Pickup and destination autocomplete with Nominatim
- Route drawing with OSRM
- Available driver listing by selected vehicle type
- Driver-side ride request queue
- Driver accept flow
- OTP verification before starting the ride
- Live tracking simulation from pickup to destination
- Ride statuses: requested, accepted, in progress, completed, cancelled
- Simulated payment after arrival
- Driver availability and completed trip tracking
- Rider rating for completed rides
- Separate rider and driver dashboards
- REST APIs plus browser UI
- H2 SQL database console

## Tech Stack

- Java 17 compatible source, tested with Java 20
- Spring Boot 3.5
- Spring MVC and REST APIs
- Thymeleaf frontend
- Spring Data JPA
- H2 database
- Maven Wrapper
- Leaflet + OpenStreetMap tiles
- Nominatim place search
- OSRM route service

## Run

```powershell
cd C:\Users\prajw\OneDrive\Desktop\Uber-Clone-main\UberJavaFullStack
.\start-app.ps1
```

`start-app.ps1` automatically stops any old copy already using port `8081`, then starts the project again. This prevents the common `Port 8081 was already in use` startup error.

To stop the app:

```powershell
.\stop-app.ps1
```

Open:

- App: http://localhost:8081
- H2 console: http://localhost:8081/h2-console

H2 JDBC URL:

```text
jdbc:h2:file:./data/uberdb
```

Username is `sa`; password is blank.

## Demo Flow

Seeded user login:

```text
Role: User
Phone: 9000000001
Password: password
```

Seeded driver login:

```text
Role: Driver
Phone: 9000000101
Password: password
```

1. Open the app and login as `User`.
2. Type pickup and destination places. Select from the suggestions list.
3. Select `Bike`, `Auto`, `Cab (5 seater)`, or `SUV (7 seater)`; fare changes by vehicle type.
4. Confirm the ride and wait for driver acceptance.
5. Logout and login as `Driver`.
6. Accept the ride request.
7. Login as the user again to see the OTP.
8. Enter that OTP on the driver dashboard and start the ride.
9. Click `Update Live Tracking` from the driver dashboard to move the car along the route.
10. After arrival, the user can pay and submit a rating.

## Main APIs

```text
GET    /api/fare-estimates
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/rides
GET    /api/rides
GET    /api/rides/active
GET    /api/riders/{riderId}/rides
GET    /api/drivers/{driverId}/requests
GET    /api/drivers/{driverId}/rides
PATCH  /api/rides/{id}/accept
PATCH  /api/rides/{id}/start
PATCH  /api/rides/{id}/progress
PATCH  /api/rides/{id}/complete
PATCH  /api/rides/{id}/cancel
PATCH  /api/rides/{id}/pay
PATCH  /api/rides/{id}/rate
GET    /api/drivers
GET    /api/drivers/available
PATCH  /api/drivers/{id}/availability
```

## Project Structure

```text
src/main/java/com/uberclone
  config       Seed data
  controller   Pages and REST APIs
  dto          API request/response objects
  model        JPA entities and enums
  repository   Spring Data repositories
  service      Ride matching, fare, and lifecycle logic

src/main/resources
  templates    Thymeleaf UI
  static       CSS and JavaScript
```
