# Uber Java Full Stack Presentation Prep

## 1. One-Minute Opening

This project is a full-stack Uber-style ride booking application. It has two roles: rider and driver. A rider can login, select pickup and destination, compare vehicle fares, book a ride, track the ride, pay, and rate the driver. A driver can login, view matching ride requests, accept a ride, verify OTP, update live tracking, complete the ride, and receive earnings.

The project uses Spring Boot for backend, React for frontend, H2 database for storage, Spring Data JPA for database access, REST APIs for normal communication, WebSocket for live updates, Leaflet maps for map display, Nominatim for location search, and OSRM for route drawing.

## 2. Explain Like I Know Nothing

Think of the app as three major parts:

```text
Frontend = what the user sees and clicks
Backend = the brain that validates and processes requests
Database = the memory where users, rides, payments, and ratings are stored
```

When a rider clicks "Confirm Ride":

```text
React button click
  -> API request to Spring Boot
  -> RideService applies business rules
  -> Repository saves ride in H2 database
  -> WebSocket tells dashboards that ride changed
  -> UI refreshes with new ride status
```

## 3. Why This Project Is Monolithic

This project is monolithic because frontend serving, authentication, ride booking, driver matching, payment simulation, wallet, ratings, WebSocket updates, and database access are all managed inside one Spring Boot application.

In a monolithic application:

```text
One backend application
One deployment
One database connection
One codebase for business logic
Internal Java method calls between features
```

In this project, `AuthService`, `RideService`, controllers, repositories, and WebSocket code all run inside the same application process. They are separated by packages, but not deployed as separate services.

## 4. Why Not Microservices

Microservices means splitting the system into independent services, for example:

```text
Auth Service
Ride Service
Driver Service
Payment Service
Notification Service
Map Service
```

That is useful for very large systems with many teams, heavy traffic, independent scaling needs, separate databases, and complex deployment pipelines.

For this project, monolith is better because:

```text
It is easier to build and demo
It is easier to debug
It avoids network calls between services
It avoids service discovery, API gateways, and distributed transactions
It is enough for a college/demo/full-stack project
All features are related and can share one database safely
```

Manager answer:

"I chose a monolithic architecture because this is a demo-scale full-stack application. It keeps deployment simple, reduces operational complexity, and lets us focus on core ride-booking features. If the project grows, we can later split modules like auth, rides, payments, and notifications into microservices."

## 5. Technologies Used

`Java`: main backend language.

`Spring Boot`: starts the backend server and makes API development easy.

`Spring MVC`: creates REST endpoints like `/api/rides`.

`Spring Data JPA`: connects Java objects to database tables.

`Hibernate`: JPA implementation that creates and updates SQL tables.

`H2 Database`: lightweight local SQL database used for demo and development.

`React`: frontend library for building dashboard UI.

`Leaflet`: map library used to show pickup, destination, route, and moving car marker.

`Nominatim`: place search service used for pickup and destination search.

`OSRM`: route service used to draw road route between pickup and destination.

`WebSocket`: real-time connection used to push ride updates to browser.

`Maven`: builds, tests, and packages the Spring Boot application.

## 6. Database Explanation

The project uses H2 file database:

```text
backend/data/uberdb.mv.db
```

Configured in:

```text
backend/src/main/resources/application.properties
```

Main database tables come from entity classes:

```text
AppUser -> users for rider and driver login
DriverProfile -> driver vehicle, location, duty, availability
Ride -> pickup, drop, fare, status, OTP, payment, rating
PaymentTransaction -> wallet topups, ride fare debit, driver earnings
```

JPA maps Java classes to tables. Repositories provide database methods without writing SQL manually.

## 7. Project Structure

```text
UberJavaFullStack/
  README.md
  DEMO_GUIDE.md
  PRESENTATION_PREP.md
  start-app.ps1
  stop-app.ps1
  frontend/
  backend/
```

`README.md`: general project overview, run steps, demo accounts, and API list.

`DEMO_GUIDE.md`: short demo flow guide.

`PRESENTATION_PREP.md`: this detailed explanation and Q&A guide.

`start-app.ps1`: stops old app on port `8081`, then starts the app.

`stop-app.ps1`: stops the app running on port `8081`.

## 8. Frontend Files

`frontend/index.html`: browser entry page. It loads React, ReactDOM, Leaflet CSS/JS, app CSS, and `app.js`.

`frontend/js/app.js`: main React application. It handles login, signup, rider dashboard, driver dashboard, map rendering, API calls, WebSocket connection, payment, wallet, rating, and state updates.

Important frontend functions:

```text
api() -> common fetch wrapper for backend calls
searchPlaces() -> searches pickup/drop places
PlaceInput -> reusable pickup/drop input component
MapPanel -> displays map, route, markers, and moving car
VehicleOptions -> shows Bike/Auto/Cab/SUV fare cards
RiderDashboard -> rider booking, payment, rating UI
DriverDashboard -> driver requests and trip control UI
PaymentPanel -> payment method and validation UI
WalletDashboardPanel -> wallet topup and transaction list UI
App -> root component that controls login state and dashboard flow
```

`frontend/css/app.css`: all UI styling for dashboards, forms, cards, map, wallet, payment, rating, and responsive layout.

`frontend/vendor/react.production.min.js`: local React library, so the app can run without installing npm packages.

`frontend/vendor/react-dom.production.min.js`: renders React into the browser DOM.

`frontend/vendor/leaflet.js` and `leaflet.css`: map library files.

`frontend/img/*.svg`: feature images shown in the app landing/feature section.

## 9. Backend Root Files

`backend/pom.xml`: Maven configuration. It defines Spring Boot, Java version, dependencies, and copies the frontend folder into Spring Boot static resources during build.

Important dependencies:

```text
spring-boot-starter-web -> REST APIs
spring-boot-starter-data-jpa -> database/JPA
spring-boot-starter-validation -> request validation
spring-boot-starter-websocket -> live updates
h2 -> local database
spring-boot-starter-test -> tests
```

`backend/mvnw` and `backend/mvnw.cmd`: Maven wrapper scripts.

`backend/src/main/resources/application.properties`: app configuration. It sets app name, port `8081`, H2 database URL, JPA mode, H2 console, and disables open-in-view.

`backend/src/test/resources/application.properties`: test database configuration. It uses in-memory H2 so tests do not damage demo data.

## 10. Main Application File

`UberJavaFullStackApplication.java`

This is the Spring Boot entry point. When we run the app, this class starts the embedded Tomcat server, loads Spring components, connects database, and serves APIs and frontend.

Presentation line:

"This is the main class. Execution starts here, and Spring Boot automatically scans controllers, services, repositories, and configuration classes."

## 11. Config Package

`DataSeeder.java`

Runs automatically at startup. If the database is empty, it creates one rider and four demo drivers for Bike, Auto, Cab, and SUV. This makes the project demo-ready.

`AuthInterceptor.java`

Checks protected API requests. It reads the `Authorization: Bearer <token>` header, verifies the token using `TokenService`, and blocks the request if token is missing or invalid.

`WebConfig.java`

Registers `AuthInterceptor` for `/api/**` endpoints, except `/api/auth/login` and `/api/auth/signup`. It also configures CORS so frontend requests are allowed.

`WebSocketConfig.java`

Registers the WebSocket endpoint:

```text
/ws/rides
```

This allows browser dashboards to receive live ride updates.

## 12. Controller Package

Controllers receive HTTP requests from the frontend.

`PageController.java`

Forwards `/` to `index.html`, so opening `http://localhost:8081` loads the React app.

`AuthApiController.java`

Exposes login and signup APIs:

```text
POST /api/auth/login
POST /api/auth/signup
```

It delegates actual logic to `AuthService`.

`RideApiController.java`

Main API controller for ride, driver, wallet, payment, and rating features.

Important endpoints:

```text
GET /api/fare-estimates
POST /api/rides
GET /api/riders/{riderId}/rides
GET /api/drivers/{driverId}/requests
PATCH /api/rides/{id}/accept
PATCH /api/rides/{id}/start
PATCH /api/rides/{id}/progress
PATCH /api/rides/{id}/complete
PATCH /api/rides/{id}/pay
PATCH /api/rides/{id}/rate
PATCH /api/rides/{id}/cancel
GET /api/drivers/available
PATCH /api/drivers/{id}/availability
GET /api/users/{id}/transactions
POST /api/users/{id}/wallet/topup
```

`ApiExceptionHandler.java`

Converts Java exceptions into JSON error messages. Instead of showing a server error page, the frontend receives:

```json
{"message":"error message"}
```

## 13. Service Package

Services contain business logic.

`AuthService.java`

Handles signup and login. It checks duplicate accounts, validates password, creates rider or driver, creates driver profile for drivers, refreshes driver duty status, and returns login token.

`TokenService.java`

Creates and verifies signed tokens. Token contains user ID, role, and expiry time. It uses HMAC SHA-256 so the backend can detect fake or modified tokens.

`GeoService.java`

Calculates distance between two latitude/longitude points using the Haversine formula. This is used for fare calculation and driver matching.

`RideService.java`

Most important business file.

Main functions:

```text
estimate() -> calculates fare options
requestRide() -> creates REQUESTED ride
acceptRide() -> assigns driver and generates OTP
startRide() -> verifies OTP and starts ride
updateProgress() -> simulates live tracking
completeRide() -> completes active ride
payRide() -> handles payment and transactions
cancelRide() -> cancels ride and restores driver availability
rateRide() -> updates driver rating
pendingForDriver() -> finds ride requests for driver vehicle type
driverRideMinutesToday() -> gets driver duty minutes
rideHoursStatus() -> returns SAFE, NEEDS_REST, or OVERTIME
```

## 14. Model Package

Models are database entities and enums.

`AppUser.java`

Represents a user account. It stores name, phone, password, role, rating, and wallet balance.

`DriverProfile.java`

Represents driver-specific data: linked user, vehicle number, vehicle name, vehicle type, driver location, availability, duty status, completed trips, rating count, and duty minutes.

`Ride.java`

Represents one ride booking. It stores rider, driver, pickup/drop address, coordinates, distance, fare, vehicle type, status, payment details, OTP, progress, timestamps, duration, and rating.

`PaymentTransaction.java`

Stores money movement. It records user, ride ID, amount, payment method, reference, status, type, description, and created time.

`Role.java`

Enum for user role:

```text
RIDER
DRIVER
```

`RideStatus.java`

Enum for ride lifecycle:

```text
REQUESTED
ACCEPTED
IN_PROGRESS
COMPLETED
CANCELLED
```

`VehicleType.java`

Enum for vehicle options. Each vehicle has label, base fare, per-km fare, and seat count.

```text
BIKE, AUTO, CAB, SUV
```

## 15. DTO Package

DTO means Data Transfer Object. These classes define what data comes in from frontend and what data goes back.

`AuthRequest.java`

Signup request data: name, phone, password, role, and driver vehicle details.

`LoginRequest.java`

Login request data: phone, password, and role.

`UserResponse.java`

Login/signup/profile response: user id, name, phone, role, rating, driver id, token, and wallet balance.

`RideRequest.java`

Ride booking request: rider ID, pickup/drop addresses, coordinates, and vehicle type.

`RideResponse.java`

Ride response sent to frontend. It includes rider/driver details, fare, status, payment, OTP, rating, driver work status, progress, coordinates, and requested time.

`FareEstimate.java`

Fare card response: vehicle type, label, seats, distance, fare, and ETA.

`TransactionResponse.java`

Wallet/transaction response: transaction id, ride id, amount, payment method, reference, status, type, description, and created time.

## 16. Repository Package

Repositories talk to the database.

`AppUserRepository.java`

Finds users by role, phone, and role. Used for login and duplicate signup checks.

`DriverProfileRepository.java`

Finds drivers by availability, vehicle type, and user ID.

`RideRepository.java`

Finds recent rides, active rides, rides by rider, rides by driver, and requested rides by vehicle type.

`PaymentTransactionRepository.java`

Finds all transactions for a user, newest first.

## 17. WebSocket Package

`RideWebSocketHandler.java`

Manages WebSocket connections. When browser connects, it verifies token, stores the session, and can send messages to all connected clients.

`RideEventPublisher.java`

Used by service layer to broadcast updates. When a ride changes, it sends a `RIDE_UPDATED` message. When driver availability changes, it sends a `DRIVER_UPDATED` message.

Presentation line:

"REST API is used for actions like login and booking. WebSocket is used for live status updates after those actions."

## 18. Tests

`UberJavaFullStackApplicationTests.java`

Checks that Spring Boot application context starts correctly.

`RideServiceTest.java`

Tests ride service business rules like driver daily limit, completing rides, and duty minutes.

`DriverProfileTest.java`

Tests driver duty minute calculations and reset behavior.

## 19. End-To-End Working Flow

1. User opens `http://localhost:8081`.
2. `PageController` serves `index.html`.
3. `index.html` loads React app from `frontend/js/app.js`.
4. User logs in as rider.
5. React calls `/api/auth/login`.
6. `AuthService` validates user and returns token.
7. Rider selects pickup and destination.
8. Frontend uses Nominatim for place search.
9. Frontend uses OSRM and Leaflet to show route.
10. React calls `/api/fare-estimates`.
11. `RideService.estimate()` calculates distance and fares.
12. Rider confirms ride.
13. React calls `POST /api/rides`.
14. `RideService.requestRide()` saves ride as `REQUESTED`.
15. Driver logs in.
16. Driver dashboard calls `/api/drivers/{driverId}/requests`.
17. Driver accepts ride.
18. `RideService.acceptRide()` assigns driver, generates OTP, status becomes `ACCEPTED`.
19. Rider sees OTP.
20. Driver enters OTP.
21. `RideService.startRide()` verifies OTP, status becomes `IN_PROGRESS`.
22. Driver updates live tracking.
23. `RideService.updateProgress()` increases progress.
24. At 100%, ride becomes `COMPLETED`.
25. Rider pays.
26. `RideService.payRide()` stores payment and transactions.
27. Rider rates driver.
28. `RideService.rateRide()` updates driver average rating.

## 20. Demo Script

Say this while showing the app:

"First I login as a rider using seeded demo data. This login goes to the backend, and the backend returns an authentication token."

"Now I enter pickup and destination. The map is rendered using Leaflet, location search uses Nominatim, and routing uses OSRM."

"When I load fare estimates, the backend calculates distance and fares for different vehicle types."

"Now I confirm the ride. The ride is saved in the database with status REQUESTED."

"Next I login as a driver. The driver only sees ride requests matching their vehicle type. The backend also checks availability and duty hours."

"When the driver accepts, the ride status becomes ACCEPTED, the driver is assigned, and an OTP is generated."

"The OTP is shown to the rider. The driver must enter the OTP to start the ride. This is a safety feature."

"After OTP verification, the ride status becomes IN_PROGRESS. Live tracking updates increase progress and move the car on the map."

"When the ride completes, the backend stores completion time, duration, driver trip count, and driver location."

"Finally, the rider pays and rates the driver. Payment creates transaction records, and rating updates the driver's average rating."

## 21. Manager Questions And Strong Answers

Q: What is the main purpose of this project?

A: It demonstrates a complete ride-booking workflow similar to Uber: login, ride booking, fare estimate, driver matching, OTP, tracking, payment, wallet, rating, and live updates.

Q: Why did you choose monolithic architecture?

A: Because this is a demo-scale full-stack application. A monolith is simpler to build, run, test, and present. All modules are still separated cleanly by packages, so it can be split into microservices later.

Q: Why not microservices?

A: Microservices add deployment, networking, service discovery, monitoring, API gateway, and distributed transaction complexity. For this project size, that overhead is not justified.

Q: How is authentication handled?

A: Login returns a signed token. Protected APIs require `Authorization: Bearer <token>`. The interceptor verifies the token before allowing access.

Q: Is password encryption implemented?

A: For demo simplicity, passwords are stored plainly. In production, I would use BCrypt hashing with Spring Security.

Q: How is fare calculated?

A: The backend calculates distance from pickup/drop coordinates, then uses vehicle base fare plus per-kilometer fare plus platform charge.

Q: How are drivers matched?

A: Drivers are filtered by availability and vehicle type. Sorting considers pickup distance, safety status, rating, and completed trips.

Q: How does OTP work?

A: When the driver accepts a ride, the backend generates an OTP. The ride can start only when the driver enters the same OTP shown to the rider.

Q: How does live tracking work?

A: This demo simulates tracking using a progress percentage. The frontend moves the car marker along the route, and backend stores progress.

Q: Why WebSocket?

A: REST APIs are request-response. WebSocket allows the backend to push live ride updates to rider and driver dashboards without page refresh.

Q: What database is used?

A: H2 file database. It is lightweight and good for local demo. Production could use PostgreSQL or MySQL.

Q: What is JPA?

A: JPA maps Java classes to database tables. Repositories let us perform database operations without writing manual SQL for every query.

Q: How is payment handled?

A: Payment is simulated. The backend validates payment method, stores payment reference and paid time, and creates transaction records.

Q: How does wallet work?

A: Users have wallet balance. Wallet topup creates a credit transaction. Ride wallet payment debits rider and credits driver.

Q: What happens when ride completes?

A: Status becomes COMPLETED, completion time is stored, duration is calculated, driver trip count increases, duty minutes are updated, and driver location moves to drop point.

Q: How do ratings work?

A: The rider gives 1 to 5 stars. Backend stores ride rating and recalculates the driver's average rating.

Q: What are future improvements?

A: Add Spring Security with BCrypt, real payment gateway, real GPS tracking, production database, cloud deployment, notification service, admin dashboard, and eventually split into microservices if scale requires it.

## 22. If You Forget, Say This Summary

"This is a monolithic full-stack ride booking app. React handles UI, Spring Boot handles APIs and business logic, H2 stores data, JPA manages database access, and WebSocket provides live updates. The project covers the complete ride lifecycle from login to booking, driver acceptance, OTP start, live tracking, completion, payment, wallet transaction, and rating."
