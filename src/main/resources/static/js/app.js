const state = {
    authMode: "login",
    role: "RIDER",
    user: null,
    vehicleType: "CAB",
    latestRide: null,
    pickup: { name: "MG Road, Bengaluru", lat: 12.9758, lng: 77.6050 },
    drop: { name: "Indiranagar, Bengaluru", lat: 12.9719, lng: 77.6412 }
};

const vehicleImages = {
    BIKE: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' rx='12' fill='%23f5fbf8'/%3E%3Ccircle cx='24' cy='44' r='10' fill='%23151819'/%3E%3Ccircle cx='72' cy='44' r='10' fill='%23151819'/%3E%3Cpath d='M28 42h18l10-18h10l8 18M45 42l-8-15h-9' fill='none' stroke='%23097a53' stroke-width='6' stroke-linecap='round'/%3E%3C/svg%3E",
    AUTO: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' rx='12' fill='%23fff8df'/%3E%3Cpath d='M15 42h66l-7-20H28L15 42z' fill='%23f1b51c'/%3E%3Cpath d='M32 22h28l8 20H22l10-20z' fill='%23151819' opacity='.85'/%3E%3Ccircle cx='28' cy='46' r='7' fill='%23151819'/%3E%3Ccircle cx='68' cy='46' r='7' fill='%23151819'/%3E%3C/svg%3E",
    CAB: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' rx='12' fill='%23eef5ff'/%3E%3Cpath d='M16 39h64l-10-18H31L16 39z' fill='%231768cf'/%3E%3Crect x='22' y='35' width='58' height='14' rx='4' fill='%231768cf'/%3E%3Cpath d='M35 25h30l5 10H28l7-10z' fill='%23ffffff' opacity='.82'/%3E%3Ccircle cx='30' cy='50' r='7' fill='%23151819'/%3E%3Ccircle cx='68' cy='50' r='7' fill='%23151819'/%3E%3C/svg%3E",
    SUV: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' rx='12' fill='%23f4f0ff'/%3E%3Cpath d='M14 39h68l-9-20H31L14 39z' fill='%236b4fd8'/%3E%3Crect x='17' y='35' width='67' height='16' rx='4' fill='%236b4fd8'/%3E%3Cpath d='M35 24h34l5 11H27l8-11z' fill='%23ffffff' opacity='.82'/%3E%3Ccircle cx='30' cy='51' r='8' fill='%23151819'/%3E%3Ccircle cx='70' cy='51' r='8' fill='%23151819'/%3E%3C/svg%3E"
};

const maps = {
    rider: {},
    driver: {}
};

const $ = selector => document.querySelector(selector);

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...options
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(error.message);
    }
    return response.json();
}

function setMessage(selector, message) {
    $(selector).textContent = message;
}

function show(view) {
    ["#authView", "#riderView", "#driverView"].forEach(id => $(id).classList.add("hidden"));
    $(view).classList.remove("hidden");
    setTimeout(() => {
        Object.values(maps).forEach(mapState => mapState.map?.invalidateSize());
    }, 100);
}

function configureAuth() {
    $("#authTitle").textContent = `${state.role === "RIDER" ? "User" : "Driver"} ${state.authMode === "login" ? "Login" : "Signup"}`;
    $("#authSubmit").textContent = state.authMode === "login" ? "Login" : "Create account";
    $("#switchAuthBtn").textContent = state.authMode === "login" ? "Create account" : "Back to login";
    document.querySelectorAll(".signup-only").forEach(item => item.classList.toggle("hidden", state.authMode === "login"));
    $("#driverSignupFields").classList.toggle("hidden", state.authMode === "login" || state.role !== "DRIVER");
    $("#phone").value = state.role === "RIDER" ? "9000000001" : "9000000101";
}

async function submitAuth(event) {
    event.preventDefault();
    try {
        const payload = {
            name: $("#name").value,
            phone: $("#phone").value,
            password: $("#password").value,
            role: state.role,
            vehicleName: $("#vehicleName").value,
            vehicleNumber: $("#vehicleNumber").value,
            vehicleType: $("#signupVehicleType").value
        };
        state.user = await api(`/api/auth/${state.authMode === "login" ? "login" : "signup"}`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        $("#logoutBtn").classList.remove("hidden");
        $("#sessionLabel").textContent = `${state.user.name} | ${state.user.role}`;
        $("#pageTitle").textContent = state.user.role === "RIDER" ? "User Dashboard" : "Driver Dashboard";
        if (state.user.role === "RIDER") {
            show("#riderView");
            initMap("rider", "riderMap");
            await drawRoute("rider", state.pickup, state.drop, 0);
            await loadEstimates();
            await refreshRider();
        } else {
            show("#driverView");
            initMap("driver", "driverMap");
            await refreshDriver();
        }
    } catch (error) {
        setMessage("#authMessage", error.message);
    }
}

function initMap(kind, elementId) {
    if (maps[kind].map) {
        maps[kind].map.invalidateSize();
        return;
    }
    const map = L.map(elementId, { zoomControl: true }).setView([12.9716, 77.5946], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    maps[kind].map = map;
}

function markerIcon(label, className) {
    return L.divIcon({
        className: `map-icon ${className}`,
        html: label,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}

function carIcon() {
    return L.divIcon({
        className: "map-icon car-icon",
        html: "Ride",
        iconSize: [42, 28],
        iconAnchor: [21, 14]
    });
}

async function drawRoute(kind, pickup, drop, progress) {
    initMap(kind, `${kind}Map`);
    const mapState = maps[kind];
    const map = mapState.map;
    const pickupLatLng = [pickup.lat, pickup.lng];
    const dropLatLng = [drop.lat, drop.lng];

    mapState.pickupMarker?.remove();
    mapState.dropMarker?.remove();
    mapState.routeLine?.remove();
    mapState.pickupMarker = L.marker(pickupLatLng, { icon: markerIcon("P", "pickup-icon") }).addTo(map);
    mapState.dropMarker = L.marker(dropLatLng, { icon: markerIcon("D", "drop-icon") }).addTo(map);

    let routePoints = [pickupLatLng, dropLatLng];
    try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`;
        const response = await fetch(osrmUrl);
        const data = await response.json();
        if (data.routes?.[0]?.geometry?.coordinates?.length) {
            routePoints = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        }
    } catch (error) {
        console.warn("Route service unavailable, using straight line", error);
    }

    mapState.routePoints = routePoints;
    mapState.routeLine = L.polyline(routePoints, { color: "#1768cf", weight: 5, opacity: 0.82 }).addTo(map);
    map.fitBounds(L.latLngBounds(routePoints), { padding: [32, 32] });
    moveCar(kind, progress);
}

function moveCar(kind, progress) {
    const mapState = maps[kind];
    if (!mapState.map || !mapState.routePoints?.length) return;
    const points = mapState.routePoints;
    const index = Math.min(points.length - 1, Math.max(0, Math.round((progress / 100) * (points.length - 1))));
    if (!mapState.carMarker) {
        mapState.carMarker = L.marker(points[index], { icon: carIcon() }).addTo(mapState.map);
    } else {
        mapState.carMarker.setLatLng(points[index]);
    }
}

async function searchPlaces(query) {
    if (query.trim().length < 3) return [];
    const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        limit: "6",
        countrycodes: "in"
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    return response.json();
}

function setupAutocomplete(inputId, resultsId, pointName) {
    const input = $(inputId);
    const results = $(resultsId);
    let timer;
    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const places = await searchPlaces(input.value);
            results.innerHTML = places.map(place => `
                <button type="button" class="suggestion-item" data-lat="${place.lat}" data-lng="${place.lon}">
                    ${place.display_name}
                </button>
            `).join("");
            results.querySelectorAll(".suggestion-item").forEach(button => {
                button.addEventListener("click", async () => {
                    state[pointName] = {
                        name: button.textContent.trim(),
                        lat: Number(button.dataset.lat),
                        lng: Number(button.dataset.lng)
                    };
                    input.value = state[pointName].name;
                    results.innerHTML = "";
                    await drawRoute("rider", state.pickup, state.drop, 0);
                    await loadEstimates();
                });
            });
        }, 350);
    });
}

async function ensurePlace(pointName, inputId) {
    const typed = $(inputId).value.trim();
    if (typed === state[pointName].name) return state[pointName];
    const places = await searchPlaces(typed);
    if (!places.length) {
        throw new Error(`Select a valid ${pointName === "pickup" ? "pickup" : "destination"} place`);
    }
    state[pointName] = {
        name: places[0].display_name,
        lat: Number(places[0].lat),
        lng: Number(places[0].lon)
    };
    $(inputId).value = state[pointName].name;
    return state[pointName];
}

async function syncPlacesFromInputs() {
    await ensurePlace("pickup", "#pickupAddress");
    await ensurePlace("drop", "#dropAddress");
    await drawRoute("rider", state.pickup, state.drop, 0);
}

function ridePayload() {
    return {
        riderId: state.user.id,
        pickupAddress: state.pickup.name,
        dropAddress: state.drop.name,
        pickupLat: state.pickup.lat,
        pickupLng: state.pickup.lng,
        dropLat: state.drop.lat,
        dropLng: state.drop.lng,
        vehicleType: state.vehicleType
    };
}

async function loadEstimates() {
    await syncPlacesFromInputs();
    const payload = ridePayload();
    const query = new URLSearchParams({
        pickupLat: payload.pickupLat,
        pickupLng: payload.pickupLng,
        dropLat: payload.dropLat,
        dropLng: payload.dropLng
    });
    const estimates = await api(`/api/fare-estimates?${query}`);
    $("#vehicleOptions").innerHTML = estimates.map(estimate => `
        <div class="vehicle-card ${estimate.vehicleType === state.vehicleType ? "active" : ""}" data-type="${estimate.vehicleType}">
            <img src="${vehicleImages[estimate.vehicleType]}" alt="${estimate.label}">
            <strong>${estimate.label}</strong>
            <span>${estimate.seats} seat${estimate.seats > 1 ? "s" : ""} | ${estimate.distanceKm} km | ${estimate.etaMinutes} min</span>
            <strong>Rs ${estimate.fare}</strong>
        </div>
    `).join("");
    document.querySelectorAll(".vehicle-card").forEach(card => {
        card.addEventListener("click", async () => {
            state.vehicleType = card.dataset.type;
            $("#riderSelectedVehicle").textContent = card.querySelector("strong").textContent;
            await loadEstimates();
            await loadAvailableDrivers();
        });
    });
    await loadAvailableDrivers();
}

async function loadAvailableDrivers() {
    const drivers = await api(`/api/drivers/available?vehicleType=${state.vehicleType}`);
    $("#availableDriverCount").textContent = `${drivers.length} online`;
    $("#availableDrivers").innerHTML = drivers.length ? drivers.map(driver => `
        <article class="driver-card">
            <div class="driver-head">
                <strong>${driver.name}</strong>
                <span class="pill">${driver.vehicleLabel}</span>
            </div>
            <div class="driver-line"><img src="${vehicleImages[driver.vehicleType]}" alt="${driver.vehicleLabel}"><span>${driver.vehicle} | ${driver.number}</span></div>
            <span class="subtle">${driver.seats} seats | Rating ${driver.rating} | Trips ${driver.trips}</span>
        </article>
    `).join("") : `<p class="subtle">No ${state.vehicleType} drivers are online right now.</p>`;
}

async function requestRide(event) {
    event.preventDefault();
    try {
        await syncPlacesFromInputs();
        setMessage("#riderStatus", "Sending request to nearby drivers...");
        state.latestRide = await api("/api/rides", {
            method: "POST",
            body: JSON.stringify(ridePayload())
        });
        showRideNotice(state.latestRide);
        await refreshRider();
    } catch (error) {
        setMessage("#riderStatus", error.message);
    }
}

async function refreshRider() {
    const rides = await api(`/api/riders/${state.user.id}/rides`);
    state.latestRide = rides[0] || null;
    $("#riderTripCount").textContent = rides.length;
    $("#riderActiveStatus").textContent = state.latestRide?.status || "Idle";
    await renderRiderRide();
}

async function renderRiderRide() {
    const ride = state.latestRide;
    showRideNotice(ride);
    if (!ride) {
        $("#riderRide").innerHTML = `<p class="subtle">No ride yet. Confirm a ride to send it to nearby drivers.</p>`;
        $("#riderProgress").style.width = "0%";
        return;
    }
    await drawRoute("rider", ridePoint(ride, "pickup"), ridePoint(ride, "drop"), ride.progressPercent);
    updateMap("rider", ride.progressPercent, mapText(ride));
    $("#riderRide").innerHTML = `
        <article class="ride-card">
            <div class="ride-head">
                <strong>#${ride.id} ${shortName(ride.pickupAddress)} to ${shortName(ride.dropAddress)}</strong>
                <span class="pill ${ride.status}">${ride.status}</span>
            </div>
            <span>${ride.vehicleLabel} | Rs ${ride.fare} | ${ride.distanceKm} km</span>
            <span class="subtle">${ride.driverName === "Searching" ? "Waiting for driver to confirm your ride" : `${ride.driverName} | ${ride.vehicle} | ${ride.driverPhone}`}</span>
            ${ride.status === "REQUESTED" ? `<div class="waiting-card"><span class="spinner"></span><div><strong>Waiting for driver to confirm</strong><span>Nearby ${ride.vehicleLabel.toLowerCase()} drivers can see your request now.</span></div></div>` : ""}
            ${ride.status === "ACCEPTED" ? `<div class="otp-box">Start OTP: <strong>${ride.otp}</strong></div>` : ""}
            ${ride.status === "COMPLETED" && !ride.paid ? `<button class="primary" onclick="payRide(${ride.id})">Pay Rs ${ride.fare}</button>` : ""}
            ${ride.status === "COMPLETED" && ride.paid ? `<div class="actions"><button onclick="rateRide(${ride.id}, 5)">Rate 5</button><button onclick="rateRide(${ride.id}, 4)">Rate 4</button></div>` : ""}
            ${["REQUESTED", "ACCEPTED"].includes(ride.status) ? `<button onclick="cancelRide(${ride.id})">Cancel ride</button>` : ""}
        </article>
    `;
}

function showRideNotice(ride) {
    const banner = $("#riderNotice");
    if (!banner) return;
    if (!ride || ["COMPLETED", "CANCELLED"].includes(ride.status)) {
        banner.classList.add("hidden");
        setMessage("#riderStatus", ride?.status === "COMPLETED" ? "Trip completed" : "Choose pickup and destination");
        return;
    }
    const messages = {
        REQUESTED: ["Waiting for driver to confirm", "Your request is live. A driver will appear here after accepting the ride."],
        ACCEPTED: ["Driver confirmed your ride", `${ride.driverName} is assigned. Share OTP ${ride.otp} only after boarding.`],
        IN_PROGRESS: ["Ride in progress", `Live tracking is active. Trip progress is ${ride.progressPercent}%.`]
    };
    const [title, text] = messages[ride.status] || [ride.status, "Ride status updated."];
    $("#riderNoticeTitle").textContent = title;
    $("#riderNoticeText").textContent = text;
    setMessage("#riderStatus", title);
    banner.dataset.status = ride.status;
    banner.classList.remove("hidden");
}

async function refreshDriver() {
    const [requests, trips] = await Promise.all([
        api(`/api/drivers/${state.user.driverId}/requests`),
        api(`/api/drivers/${state.user.driverId}/rides`)
    ]);
    $("#driverRequestCount").textContent = requests.length;
    $("#driverTripCount").textContent = trips.length;
    renderDriverRequests(requests);
    await renderDriverTrips(trips);
}

function renderDriverRequests(requests) {
    $("#driverRequests").innerHTML = requests.length ? requests.map(ride => `
        <article class="ride-card">
            <div class="ride-head">
                <strong>#${ride.id} ${ride.riderName}</strong>
                <span class="pill">${ride.vehicleLabel}</span>
            </div>
            <span>${shortName(ride.pickupAddress)} to ${shortName(ride.dropAddress)}</span>
            <span>Rs ${ride.fare} | ${ride.distanceKm} km</span>
            <button class="primary" onclick="acceptRide(${ride.id})">Accept Ride</button>
        </article>
    `).join("") : `<p class="subtle">No new matching ride requests yet.</p>`;
}

async function renderDriverTrips(trips) {
    const active = trips.find(ride => ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(ride.status));
    if (active) {
        await drawRoute("driver", ridePoint(active, "pickup"), ridePoint(active, "drop"), active.progressPercent);
        updateMap("driver", active.progressPercent, mapText(active));
    }
    $("#driverTrips").innerHTML = trips.length ? trips.map(ride => `
        <article class="ride-card">
            <div class="ride-head">
                <strong>#${ride.id} ${ride.riderName}</strong>
                <span class="pill ${ride.status}">${ride.status}</span>
            </div>
            <span>${shortName(ride.pickupAddress)} to ${shortName(ride.dropAddress)}</span>
            <span>${ride.vehicleLabel} | Rs ${ride.fare} | OTP required from user</span>
            ${driverButtons(ride)}
        </article>
    `).join("") : `<p class="subtle">Accepted trips will appear here.</p>`;
}

function driverButtons(ride) {
    if (ride.status === "ACCEPTED") {
        return `
            <div class="actions">
                <input class="otp-input" id="otp-${ride.id}" placeholder="Enter OTP">
                <button class="primary" onclick="startRide(${ride.id})">Verify & Start</button>
            </div>
        `;
    }
    if (ride.status === "IN_PROGRESS") {
        return `<button class="primary" onclick="progressRide(${ride.id})">Update Live Tracking</button>`;
    }
    if (ride.status === "COMPLETED" && !ride.paid) {
        return `<span class="subtle">Waiting for user payment</span>`;
    }
    if (ride.status === "COMPLETED" && ride.paid) {
        return `<span class="subtle">Paid and completed</span>`;
    }
    return "";
}

async function acceptRide(id) {
    await api(`/api/rides/${id}/accept`, {
        method: "PATCH",
        body: JSON.stringify({ driverId: state.user.driverId })
    });
    await refreshDriver();
}

async function startRide(id) {
    try {
        await api(`/api/rides/${id}/start`, {
            method: "PATCH",
            body: JSON.stringify({ otp: $(`#otp-${id}`).value })
        });
        await refreshDriver();
    } catch (error) {
        $("#driverMapHint").textContent = error.message;
    }
}

async function progressRide(id) {
    await api(`/api/rides/${id}/progress`, { method: "PATCH", body: "{}" });
    await refreshDriver();
}

async function payRide(id) {
    await api(`/api/rides/${id}/pay`, { method: "PATCH", body: "{}" });
    await refreshRider();
}

async function cancelRide(id) {
    await api(`/api/rides/${id}/cancel`, { method: "PATCH", body: "{}" });
    await refreshRider();
}

async function rateRide(id, rating) {
    await api(`/api/rides/${id}/rate`, {
        method: "PATCH",
        body: JSON.stringify({ rating })
    });
    setMessage("#riderStatus", "Thanks for the feedback");
    await refreshRider();
}

function ridePoint(ride, type) {
    return type === "pickup"
        ? { name: ride.pickupAddress, lat: ride.pickupLat, lng: ride.pickupLng }
        : { name: ride.dropAddress, lat: ride.dropLat, lng: ride.dropLng };
}

function shortName(value) {
    return value.split(",").slice(0, 2).join(",").trim();
}

function mapText(ride) {
    if (ride.status === "REQUESTED") return "Waiting for driver to confirm";
    if (ride.status === "ACCEPTED") return "Driver accepted | share OTP";
    if (ride.status === "IN_PROGRESS") return `Travelling | ${ride.progressPercent}%`;
    if (ride.status === "COMPLETED" && !ride.paid) return "Arrived | payment pending";
    if (ride.status === "COMPLETED") return "Trip completed";
    return ride.status;
}

function updateMap(kind, progress, label) {
    const progressBar = $(`#${kind}Progress`);
    const hint = kind === "rider" ? $("#mapHint") : $("#driverMapHint");
    const clamped = Math.max(0, Math.min(100, progress));
    moveCar(kind, clamped);
    progressBar.style.width = `${clamped}%`;
    hint.textContent = label;
}

document.querySelectorAll(".role-tab").forEach(button => {
    button.addEventListener("click", () => {
        state.role = button.dataset.role;
        document.querySelectorAll(".role-tab").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        configureAuth();
    });
});

$("#switchAuthBtn").addEventListener("click", () => {
    state.authMode = state.authMode === "login" ? "signup" : "login";
    configureAuth();
});
$("#authForm").addEventListener("submit", submitAuth);
$("#rideForm").addEventListener("submit", requestRide);
$("#estimateBtn").addEventListener("click", loadEstimates);
$("#refreshRiderBtn").addEventListener("click", refreshRider);
$("#refreshDriverBtn").addEventListener("click", refreshDriver);
$("#logoutBtn").addEventListener("click", () => window.location.reload());

setupAutocomplete("#pickupAddress", "#pickupResults", "pickup");
setupAutocomplete("#dropAddress", "#dropResults", "drop");
configureAuth();

setInterval(async () => {
    if (!state.user) return;
    if (state.user.role === "RIDER") await refreshRider();
    if (state.user.role === "DRIVER") await refreshDriver();
}, 6000);
