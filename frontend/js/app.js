const h = React.createElement;
const { useEffect, useMemo, useRef, useState } = React;
let sessionToken = "";

const defaultPickup = { name: "MG Road, Bengaluru", lat: 12.9758, lng: 77.6050 };
const defaultDrop = { name: "Indiranagar, Bengaluru", lat: 12.9719, lng: 77.6412 };

const paymentMethods = [
    { id: "UPI", label: "UPI", detail: "Instant transfer" },
    { id: "CARD", label: "Card", detail: "Debit or credit" },
    { id: "WALLET", label: "Wallet", detail: "App balance" },
    { id: "CASH", label: "Cash", detail: "Pay driver" }
];

const featureCards = [
    { title: "Ride", text: "Book pickup and drop locations, compare fares, and track the assigned driver.", image: "/img/feature-ride.svg" },
    { title: "Reserve", text: "Preview fare, distance, and ETA before the ride request goes live.", image: "/img/feature-reserve.svg" },
    { title: "Intercity", text: "Search Indian locations and draw pickup-to-destination routes on a real map.", image: "/img/feature-intercity.svg" },
    { title: "Payments", text: "Close the trip with UPI, card, wallet, or cash and generate a receipt.", image: "/img/feature-payment.svg" },
    { title: "Driver Hours", text: "Track duty time, safe limits, rest advice, and overtime risk.", image: "/img/feature-hours.svg" },
    { title: "Ratings", text: "Capture rider feedback and keep trust visible across driver cards.", image: "/img/feature-rating.svg" }
];

const vehicleImages = {
    BIKE: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' rx='12' fill='%23f5fbf8'/%3E%3Ccircle cx='24' cy='44' r='10' fill='%23151819'/%3E%3Ccircle cx='72' cy='44' r='10' fill='%23151819'/%3E%3Cpath d='M28 42h18l10-18h10l8 18M45 42l-8-15h-9' fill='none' stroke='%23097a53' stroke-width='6' stroke-linecap='round'/%3E%3C/svg%3E",
    AUTO: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' rx='12' fill='%23fff8df'/%3E%3Cpath d='M15 42h66l-7-20H28L15 42z' fill='%23f1b51c'/%3E%3Cpath d='M32 22h28l8 20H22l10-20z' fill='%23151819' opacity='.85'/%3E%3Ccircle cx='28' cy='46' r='7' fill='%23151819'/%3E%3Ccircle cx='68' cy='46' r='7' fill='%23151819'/%3E%3C/svg%3E",
    CAB: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' rx='12' fill='%23eef5ff'/%3E%3Cpath d='M16 39h64l-10-18H31L16 39z' fill='%231768cf'/%3E%3Crect x='22' y='35' width='58' height='14' rx='4' fill='%231768cf'/%3E%3Cpath d='M35 25h30l5 10H28l7-10z' fill='%23ffffff' opacity='.82'/%3E%3Ccircle cx='30' cy='50' r='7' fill='%23151819'/%3E%3Ccircle cx='68' cy='50' r='7' fill='%23151819'/%3E%3C/svg%3E",
    SUV: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' rx='12' fill='%23f4f0ff'/%3E%3Cpath d='M14 39h68l-9-20H31L14 39z' fill='%236b4fd8'/%3E%3Crect x='17' y='35' width='67' height='16' rx='4' fill='%236b4fd8'/%3E%3Cpath d='M35 24h34l5 11H27l8-11z' fill='%23ffffff' opacity='.82'/%3E%3Ccircle cx='30' cy='51' r='8' fill='%23151819'/%3E%3Ccircle cx='70' cy='51' r='8' fill='%23151819'/%3E%3C/svg%3E"
};

function cx(...parts) {
    return parts.filter(Boolean).join(" ");
}

const BASE_URL = "";

async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
    }
    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    const response = await fetch(url, {
        ...options,
        headers
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(error.message || "Request failed");
    }
    return response.json();
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

function formatWorkMinutes(minutes = 0) {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    if (safeMinutes < 60) return `${safeMinutes} min`;
    return `${Math.floor(safeMinutes / 60)}h ${String(safeMinutes % 60).padStart(2, "0")}m`;
}

function workStatusLabel(status) {
    return {
        SAFE: "Safe hours",
        NEEDS_REST: "Rest advised",
        OVERTIME: "Overtime risk",
        UNKNOWN: "Not assigned"
    }[status] || status;
}

function verificationLabel(status = "PENDING_REVIEW") {
    return {
        VERIFIED: "Background verified",
        PENDING_REVIEW: "Review pending",
        REJECTED: "Verification rejected"
    }[status] || "Review pending";
}

function VerificationBadge({ status = "PENDING_REVIEW" }) {
    return h("span", { className: cx("verification-badge", status) }, verificationLabel(status));
}

function shortName(value = "") {
    return value.split(",").slice(0, 2).join(",").trim();
}

function ridePoint(ride, type) {
    return type === "pickup"
        ? { name: ride.pickupAddress, lat: ride.pickupLat, lng: ride.pickupLng }
        : { name: ride.dropAddress, lat: ride.dropLat, lng: ride.dropLng };
}

function mapText(ride) {
    if (!ride) return "Pickup to destination";
    if (ride.status === "REQUESTED") return "Waiting for driver to confirm";
    if (ride.status === "ACCEPTED") return "Driver accepted | share OTP";
    if (ride.status === "IN_PROGRESS") return `Travelling | ${ride.progressPercent}%`;
    if (ride.status === "COMPLETED" && !ride.paid) return "Arrived | payment pending";
    if (ride.status === "COMPLETED") return "Trip completed";
    return ride.status;
}

function Field({ label, children, className }) {
    return h("label", { className }, h("span", null, label), children);
}

function SectionTitle({ title, meta, action }) {
    return h("div", { className: "section-title" },
        h("div", null, h("h2", null, title), meta ? h("span", null, meta) : null),
        action || null
    );
}

function Stars({ rating = 0 }) {
    const rounded = Math.round(Number(rating) || 0);
    const filled = String.fromCharCode(9733);
    const empty = String.fromCharCode(9734);
    return h("span", { className: "stars", "aria-label": `${rating} out of 5` },
        [1, 2, 3, 4, 5].map(star => star <= rounded ? filled : empty).join("")
    );
}

function SafetyBadge({ status = "UNKNOWN" }) {
    return h("span", { className: cx("safety-badge", status) }, workStatusLabel(status));
}

function SafetyWarning({ status = "UNKNOWN", audience = "driver" }) {
    if (!["NEEDS_REST", "OVERTIME"].includes(status)) return null;
    const messages = {
        NEEDS_REST: audience === "rider"
            ? ["Driver rest advised", "This driver has crossed the safe daily ride-hour limit. Please stay alert and confirm they are fit to continue."]
            : ["Rest advised", "You have crossed the safe daily ride-hour limit. Complete the current trip, go offline, and rest before accepting more rides."],
        OVERTIME: audience === "rider"
            ? ["Overtime risk", "This driver has reached the overtime ride-hour limit today. Consider choosing another driver before starting a new trip."]
            : ["Overtime risk", "Your ride hours have reached the overtime limit today. Go offline and rest before taking another trip."]
    };
    const [title, text] = messages[status];
    return h("div", { className: "warning-banner", "data-safety-status": status, role: "alert" },
        h("strong", null, title),
        h("span", null, text)
    );
}

function Topbar({ user, view, onLogout, onWalletClick }) {
    // Determine wallet label and balance
    const balance = user ? user.walletBalance : 0;
    const walletText = user ? (user.role === "DRIVER" ? `Earnings: Rs ${Number(balance || 0).toFixed(2)}` : `Wallet: Rs ${Number(balance || 0).toFixed(2)}`) : "";

    return h("header", { className: "topbar" },
        h("a", { className: "brand-lockup", href: "#", onClick: (e) => { e.preventDefault(); if (user && onWalletClick) onWalletClick("dashboard"); } },
            h("span", { className: "brand-mark" }, "Smart Ride"),
            h("span", { className: "brand-copy" },
                h("span", null, "Fast & Affordable"),
                h("strong", null, user ? `${user.role === "RIDER" ? "Rider" : "Driver"} dashboard` : "Safe & Reliable")
            )
        ),
        !user ? h("nav", { className: "top-nav", "aria-label": "Main navigation" },
            h("a", { href: "#usages" }, "Usages"),
            h("a", { href: "#offers" }, "Offers"),
            h("a", { href: "#safety" }, "Safety")
        ) : null,
        h("div", { className: "top-actions" },
            user ? h("button", { className: cx("wallet-pill-btn", user.role.toLowerCase()), onClick: () => onWalletClick && onWalletClick("wallet") }, walletText) : null,
            h("span", null, user ? `${user.name} | ${user.role}` : view === "auth" ? "Not signed in" : ""),
            user ? h("button", { className: "ghost", onClick: onLogout }, "Logout") : null
        )
    );
}

function AuthView({ role, setRole, authMode, setAuthMode, onSubmit, message }) {
    const [form, setForm] = useState({
        name: "",
        phone: "9000000001",
        password: "password",
        vehicleName: "",
        vehicleNumber: "",
        vehicleType: "CAB",
        drivingLicenseNumber: "",
        rcNumber: "",
        insurancePolicyNumber: "",
        accidentCount: "0",
        challanCount: "0"
    });

    const [activeSafetyTab, setActiveSafetyTab] = useState("otp");
    const [copiedCode, setCopiedCode] = useState(null);
    const [backgroundCheck, setBackgroundCheck] = useState(null);
    const [checkingBackground, setCheckingBackground] = useState(false);

    function copyPromoCode(code) {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2500);
    }

    useEffect(() => {
        setForm(current => ({ ...current, phone: role === "RIDER" ? "9000000001" : "9000000101" }));
        setBackgroundCheck(null);
    }, [role]);

    useEffect(() => {
        setBackgroundCheck(null);
    }, [authMode]);

    function update(field, value) {
        setForm(current => ({ ...current, [field]: value }));
        if (["vehicleNumber", "drivingLicenseNumber", "rcNumber", "insurancePolicyNumber"].includes(field)) {
            setBackgroundCheck(null);
        }
    }

    function backgroundPayload(current = form) {
        return {
            driverName: current.name,
            vehicleNumber: current.vehicleNumber,
            drivingLicenseNumber: current.drivingLicenseNumber,
            rcNumber: current.rcNumber,
            insurancePolicyNumber: current.insurancePolicyNumber,
            accidentCount: Number(current.accidentCount) || 0,
            challanCount: Number(current.challanCount) || 0
        };
    }

    async function runBackgroundCheck(current = form) {
        setCheckingBackground(true);
        try {
            const result = await api("/api/auth/driver-background-check", {
                method: "POST",
                body: JSON.stringify(backgroundPayload(current))
            });
            setBackgroundCheck(result);
            return result;
        } catch (error) {
            const result = { approved: false, status: "REJECTED", message: error.message };
            setBackgroundCheck(result);
            return result;
        } finally {
            setCheckingBackground(false);
        }
    }

    async function submit(event) {
        event.preventDefault();
        if (authMode === "signup" && role === "DRIVER") {
            const result = await runBackgroundCheck(form);
            if (!result.approved) return;
        }
        onSubmit(form);
    }

    return h("section", { className: "auth-layout" },
        h("div", { className: "hero" },
            h("div", { className: "hero-content" },
                h("p", { className: "eyebrow" }, "Smart Ride Platform"),
                h("h1", null, "Your ride, on demand. Easy and reliable."),
                h("p", { className: "hero-copy" },
                    "Track your driver in real-time on active maps, verify every trip with safe OTP starts, pay digitally or in cash, and experience secure travel with verified professional drivers."
                ),
                h("div", { className: "hero-metrics", "aria-label": "Application highlights" },
                    h("span", null, h("strong", null, "Realtime"), h("small", null, "Live map tracking")),
                    h("span", null, h("strong", null, "4 modes"), h("small", null, "Bike, Auto, Cab, SUV")),
                    h("span", null, h("strong", null, "Secure"), h("small", null, "OTP verified trips"))
                )
            )
        ),
        h("aside", { className: "panel auth-card" },
            h("div", { className: "segmented-control" },
                h("span", { className: cx("segmented-slider", role.toLowerCase()) }),
                h("button", {
                    className: cx("segment-btn", role === "RIDER" && "active"),
                    onClick: () => setRole("RIDER"),
                    type: "button"
                }, "User"),
                h("button", {
                    className: cx("segment-btn", role === "DRIVER" && "active"),
                    onClick: () => setRole("DRIVER"),
                    type: "button"
                }, "Driver")
            ),
            SectionTitle({
                title: `${role === "RIDER" ? "User" : "Driver"} ${authMode === "login" ? "Login" : "Signup"}`,
                meta: authMode === "login" ? "Use seeded demo accounts" : "Create a profile",
                action: h("button", { type: "button", onClick: () => setAuthMode(authMode === "login" ? "signup" : "login") },
                    authMode === "login" ? "Create account" : "Back to login")
            }),
            h("form", { onSubmit: submit },
                authMode === "signup" ? Field({
                    label: "Full name",
                    children: h("input", {
                        value: form.name,
                        onChange: event => update("name", event.target.value),
                        placeholder: "Enter name",
                        required: true
                    })
                }) : null,
                Field({
                    label: "Phone",
                    children: h("input", {
                        value: form.phone,
                        onChange: event => update("phone", event.target.value),
                        placeholder: "Phone number",
                        required: true
                    })
                }),
                Field({
                    label: "Password",
                    children: h("input", {
                        type: "password",
                        value: form.password,
                        onChange: event => update("password", event.target.value),
                        required: true
                    })
                }),
                authMode === "signup" && role === "DRIVER" ? h("div", { className: "grid two" },
                    Field({
                        label: "Vehicle name",
                        children: h("input", {
                            value: form.vehicleName,
                            onChange: event => update("vehicleName", event.target.value),
                            placeholder: "Honda City"
                        })
                    }),
                    Field({
                        label: "Vehicle number",
                        children: h("input", {
                            value: form.vehicleNumber,
                            onChange: event => update("vehicleNumber", event.target.value),
                            placeholder: "KA 05 AB 1234"
                        })
                    }),
                    Field({
                        label: "Vehicle type",
                        className: "wide",
                        children: h("select", {
                            value: form.vehicleType,
                            onChange: event => update("vehicleType", event.target.value)
                        },
                            h("option", { value: "BIKE" }, "Bike"),
                            h("option", { value: "AUTO" }, "Auto"),
                            h("option", { value: "CAB" }, "Cab (5 seater)"),
                            h("option", { value: "SUV" }, "SUV (7 seater)")
                        )
                    })
                ) : null,
                authMode === "signup" && role === "DRIVER" ? h("div", { className: "background-check wide" },
                    h("div", { className: "grid two" },
                        Field({
                            label: "Driving license",
                            children: h("input", {
                                value: form.drivingLicenseNumber,
                                onChange: event => update("drivingLicenseNumber", event.target.value),
                                placeholder: "DLKA20240001",
                                required: true
                            })
                        }),
                        Field({
                            label: "RC number",
                            children: h("input", {
                                value: form.rcNumber,
                                onChange: event => update("rcNumber", event.target.value),
                                placeholder: "RCKA05AB1234",
                                required: true
                            })
                        })
                    ),
                    Field({
                        label: "Insurance policy",
                        className: "wide",
                        children: h("input", {
                            value: form.insurancePolicyNumber,
                            onChange: event => update("insurancePolicyNumber", event.target.value),
                            placeholder: "INS-2026-0001",
                            required: true
                        })
                    }),
                    h("button", {
                        type: "button",
                        className: "check-btn",
                        onClick: () => runBackgroundCheck(),
                        disabled: checkingBackground
                    }, checkingBackground ? "Checking..." : "Check background"),
                    backgroundCheck ? h("div", {
                        className: cx("verification-result",
                            backgroundCheck.status === "VERIFIED" ? "approved" :
                                backgroundCheck.status === "PENDING_REVIEW" ? "pending" : "rejected"),
                        role: "status"
                    },
                        h("strong", null, backgroundCheck.status),
                        h("span", null, backgroundCheck.message),
                        h("small", null, `Accidents ${backgroundCheck.accidentCount} | Challans ${backgroundCheck.challanCount} | ${backgroundCheck.registrySource}`)
                    ) : null
                ) : null,
                h("button", { className: "primary", type: "submit", disabled: checkingBackground },
                    authMode === "login" ? "Login" : role === "DRIVER" ? "Verify and create account" : "Create account"),
                h("p", { className: "message", role: "status" }, message)
            )
        ),
        h("section", { className: "usages-section", id: "usages" },
            h("div", { className: "section-header-center" },
                h("span", { className: "section-kicker" }, "Services"),
                h("h2", null, "Designed for every journey")
            ),
            h("div", { className: "usages-grid" },
                [
                    { title: "Commutes", desc: "Daily travel made simple. Reach your destination on time.", icon: "🚗" },
                    { title: "Airport transfers", desc: "Reliable pickups with extra room for luggage.", icon: "✈️" },
                    { title: "Intercity travel", desc: "Comfortable highway cruising for outstation trips.", icon: "🛣️" },
                    { title: "Safe nights out", desc: "Verified drivers and OTP security for late-night travel.", icon: "🌙" }
                ].map(item => h("article", { key: item.title, className: "usage-card" },
                    h("div", { className: "usage-icon" }, item.icon),
                    h("h3", null, item.title),
                    h("p", null, item.desc)
                ))
            )
        ),
        h("section", { className: "offers-section", id: "offers" },
            h("div", { className: "section-header-center" },
                h("span", { className: "section-kicker" }, "Exclusive deals"),
                h("h2", null, "Save on your next rides")
            ),
            h("div", { className: "offers-grid" },
                [
                    { title: "New Rider Discount", code: "GET20", desc: "Get 20% off your first ride. Save up to Rs. 100 instantly.", badge: "New User" },
                    { title: "Referral Bonus", code: "REFER100", desc: "Earn Rs. 100 wallet balance when you invite a friend to ride.", badge: "Referrals" },
                    { title: "Business Travelers", code: "BIZPASS", desc: "Get priority dispatch and 10% cashback on all office trips.", badge: "Business" }
                ].map(promo => h("div", {
                    key: promo.code,
                    className: cx("promo-card", copiedCode === promo.code && "copied"),
                    onClick: () => copyPromoCode(promo.code)
                },
                    h("div", { className: "promo-badge" }, promo.badge),
                    h("h3", null, promo.title),
                    h("p", null, promo.desc),
                    h("div", { className: "promo-code-box" },
                        h("span", { className: "promo-code" }, promo.code),
                        h("span", { className: "promo-copy-btn" }, copiedCode === promo.code ? "✓ Copied" : "Copy Code")
                    )
                ))
            )
        ),
        h("section", { className: "safety-highlight-section", id: "safety" },
            h("div", { className: "section-header-center" },
                h("span", { className: "section-kicker" }, "Safety First"),
                h("h2", null, "Your security is our priority")
            ),
            h("div", { className: "safety-content" },
                h("div", { className: "safety-sidebar" },
                    [
                        { id: "otp", title: "OTP Starts", desc: "Rides only start after you share the correct 4-digit code with the driver.", icon: "🔒" },
                        { id: "limits", title: "Driver Safety Limits", desc: "We track and limit continuous driving hours to prevent fatigue.", icon: "⏳" },
                        { id: "tracking", title: "Live Trip Tracking", desc: "Share your route in real-time with family or friends via active maps.", icon: "📍" }
                    ].map(item => h("button", {
                        key: item.id,
                        className: cx("safety-tab-btn", activeSafetyTab === item.id && "active"),
                        onClick: () => setActiveSafetyTab(item.id),
                        type: "button"
                    },
                        h("span", { className: "safety-tab-icon" }, item.icon),
                        h("span", { className: "safety-tab-text" },
                            h("strong", null, item.title),
                            h("span", null, item.desc)
                        )
                    ))
                ),
                h("div", { className: "safety-preview-panel" },
                    activeSafetyTab === "otp" ? h("div", { className: "safety-mockup otp-mockup" },
                        h("div", { className: "mockup-screen" },
                            h("div", { className: "mockup-header" }, "Verify Ride"),
                            h("div", { className: "mockup-body" },
                                h("div", { className: "otp-shield" }, "✓"),
                                h("h4", null, "Share OTP with Driver"),
                                h("div", { className: "otp-display-code" }, "4 8 2 1"),
                                h("p", null, "Rides start only when verified. Ensure you are boarding the correct vehicle.")
                            )
                        )
                    ) : null,
                    activeSafetyTab === "limits" ? h("div", { className: "safety-mockup limits-mockup" },
                        h("div", { className: "mockup-screen" },
                            h("div", { className: "mockup-header" }, "Safety Hours"),
                            h("div", { className: "mockup-body" },
                                h("div", { className: "meter-container" },
                                    h("div", { className: "meter-dial" },
                                        h("span", { className: "meter-value" }, "7h 45m"),
                                        h("span", { className: "meter-sub" }, "Driven Today")
                                    )
                                ),
                                h("div", { className: "safety-badge-mock NEEDS_REST" }, "Rest Advised"),
                                h("p", null, "Driver duty shifts are strictly monitored and limited to keep trips 100% safe.")
                            )
                        )
                    ) : null,
                    activeSafetyTab === "tracking" ? h("div", { className: "safety-mockup tracking-mockup" },
                        h("div", { className: "mockup-screen" },
                            h("div", { className: "mockup-header" }, "Live Tracking"),
                            h("div", { className: "mockup-body" },
                                h("div", { className: "map-graphic" },
                                    h("span", { className: "marker pickup" }, "P"),
                                    h("span", { className: "route-line-graphic" }),
                                    h("span", { className: "marker drop" }, "D"),
                                    h("span", { className: "car-marker-graphic" }, "🚗")
                                ),
                                h("button", { className: "share-btn-mock", type: "button" }, "Share Trip Status"),
                                h("p", null, "Share your active coordinates with loved ones in one click.")
                            )
                        )
                    ) : null
                )
            )
        ),
        h("section", { className: "cta-dual-section" },
            h("div", { className: "cta-card rider-cta" },
                h("div", { className: "cta-content" },
                    h("span", { className: "cta-kicker" }, "Ride with us"),
                    h("h2", null, "Ready to get moving?"),
                    h("p", null, "Sign up as a Rider to book affordable and comfortable rides instantly."),
                    h("button", {
                        className: "primary cta-btn",
                        onClick: () => {
                            setRole("RIDER");
                            setAuthMode("signup");
                            document.querySelector(".auth-card")?.scrollIntoView({ behavior: "smooth" });
                        }
                    }, "Sign Up to Ride")
                )
            ),
            h("div", { className: "cta-card driver-cta" },
                h("div", { className: "cta-content" },
                    h("span", { className: "cta-kicker" }, "Drive with us"),
                    h("h2", null, "Want to earn on your schedule?"),
                    h("p", null, "Sign up as a Driver to offer reliable rides, manage your own shifts, and make competitive earnings."),
                    h("button", {
                        className: "primary cta-btn",
                        onClick: () => {
                            setRole("DRIVER");
                            setAuthMode("signup");
                            document.querySelector(".auth-card")?.scrollIntoView({ behavior: "smooth" });
                        }
                    }, "Become a Driver")
                )
            )
        )
    );
}

function PlaceInput({ label, value, onInput, onSelect }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const userEdited = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            if (!userEdited.current) return;
            if (value.trim().length < 3) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const places = await searchPlaces(value);
                if (!cancelled) setResults(places);
            } catch (error) {
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [value]);

    return Field({
        label,
        className: "place-field",
        children: h(React.Fragment, null,
            h("input", {
                value,
                onChange: event => {
                    userEdited.current = true;
                    onInput(event.target.value);
                },
                autoComplete: "off",
                required: true
            }),
            results.length || loading ? h("div", { className: "suggestions" },
                loading ? h("span", { className: "suggestion-loading" }, "Searching locations...") : null,
                results.map(place => h("button", {
                    key: `${place.place_id}-${place.lat}`,
                    type: "button",
                    className: "suggestion-item",
                    onClick: () => {
                        userEdited.current = false;
                        setResults([]);
                        onSelect({
                            name: place.display_name,
                            lat: Number(place.lat),
                            lng: Number(place.lon)
                        });
                    }
                }, place.display_name))
            ) : null
        )
    });
}

function MapPanel({ title, meta, pickup, drop, progress = 0, className = "" }) {
    const elementRef = useRef(null);
    const mapState = useRef({});

    useEffect(() => {
        if (!elementRef.current || mapState.current.map || !window.L) return;
        const map = L.map(elementRef.current, { zoomControl: true }).setView([12.9716, 77.5946], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);
        mapState.current.map = map;
        setTimeout(() => map.invalidateSize(), 100);
    }, []);

    useEffect(() => {
        const state = mapState.current;
        if (!state.map || !pickup || !drop) return;
        let cancelled = false;

        async function draw() {
            const map = state.map;
            const pickupLatLng = [pickup.lat, pickup.lng];
            const dropLatLng = [drop.lat, drop.lng];
            state.pickupMarker?.remove();
            state.dropMarker?.remove();
            state.routeLine?.remove();

            state.pickupMarker = L.marker(pickupLatLng, { icon: markerIcon("P", "pickup-icon") }).addTo(map);
            state.dropMarker = L.marker(dropLatLng, { icon: markerIcon("D", "drop-icon") }).addTo(map);

            let routePoints = [pickupLatLng, dropLatLng];
            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`;
                const response = await fetch(osrmUrl);
                const data = await response.json();
                if (!cancelled && data.routes?.[0]?.geometry?.coordinates?.length) {
                    routePoints = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                }
            } catch (error) {
                console.warn("Route service unavailable, using straight line", error);
            }

            if (cancelled) return;
            state.routePoints = routePoints;
            state.routeLine = L.polyline(routePoints, { color: "#111111", weight: 5, opacity: 0.82 }).addTo(map);
            map.fitBounds(L.latLngBounds(routePoints), { padding: [32, 32] });
            moveCar(state, progress);
        }

        draw();
        return () => {
            cancelled = true;
        };
    }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

    useEffect(() => {
        moveCar(mapState.current, progress);
    }, [progress]);

    return h("div", { className: cx("panel map-panel", className) },
        SectionTitle({ title, meta }),
        h("div", { className: "map live-map", ref: elementRef }),
        h("div", { className: "progress" }, h("span", { style: { width: `${Math.max(0, Math.min(100, progress))}%` } }))
    );
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

function moveCar(state, progress) {
    if (!state.map || !state.routePoints?.length) return;
    const points = state.routePoints;
    const index = Math.min(points.length - 1, Math.max(0, Math.round((progress / 100) * (points.length - 1))));
    if (!state.carMarker) {
        state.carMarker = L.marker(points[index], { icon: carIcon() }).addTo(state.map);
    } else {
        state.carMarker.setLatLng(points[index]);
    }
}

function VehicleOptions({ estimates, vehicleType, onSelect }) {
    return h("div", { className: "vehicle-row" },
        estimates.map(estimate => h("button", {
            key: estimate.vehicleType,
            type: "button",
            className: cx("vehicle-card", estimate.vehicleType === vehicleType && "active"),
            onClick: () => onSelect(estimate.vehicleType)
        },
            h("img", { src: vehicleImages[estimate.vehicleType], alt: estimate.label }),
            h("span", { className: "vehicle-copy" },
                h("strong", null, estimate.label),
                h("small", null, `${estimate.seats} seat${estimate.seats > 1 ? "s" : ""} | ${estimate.distanceKm} km | ${estimate.etaMinutes} min`),
                h("b", null, `Rs ${estimate.fare}`)
            )
        ))
    );
}

function DashboardStrip({ items }) {
    return h("div", { className: "dashboard-strip" },
        items.map(item => h("div", { key: item.label },
            h("strong", null, item.value),
            h("span", null, item.label)
        ))
    );
}

function RideNotice({ ride }) {
    if (!ride || ["COMPLETED", "CANCELLED"].includes(ride.status)) return null;
    const messages = {
        REQUESTED: ["Waiting for driver to confirm", "Your request is live. A nearby driver can accept it now."],
        ACCEPTED: ["Driver confirmed your ride", `${ride.driverName} is assigned. Share OTP ${ride.otp} only after boarding.`],
        IN_PROGRESS: ["Ride in progress", `Live tracking is active. Trip progress is ${ride.progressPercent}%.`]
    };
    const [title, text] = messages[ride.status] || [ride.status, "Ride status updated."];
    return h("div", { className: "status-banner", "data-status": ride.status, role: "status" },
        h("div", { className: "status-icon" }),
        h("div", null, h("strong", null, title), h("span", null, text))
    );
}

function DriverCard({ driver }) {
    return h("article", { className: "driver-card" },
        h("div", { className: "driver-head" },
            h("strong", null, driver.name),
            h("span", { className: "driver-badges" },
                h(VerificationBadge, { status: driver.verificationStatus }),
                h("span", { className: "pill" }, driver.vehicleLabel)
            )
        ),
        h("div", { className: "driver-line" },
            h("img", { src: vehicleImages[driver.vehicleType], alt: driver.vehicleLabel }),
            h("span", null, `${driver.vehicle} | ${driver.number}`)
        ),
        h("div", { className: "metric-row" },
            h("span", null, h(Stars, { rating: driver.rating }), ` ${Number(driver.rating).toFixed(1)}`),
            h("span", null, `${formatWorkMinutes(driver.workMinutesToday)} today`),
            h(SafetyBadge, { status: driver.workStatus })
        ),
        h("span", { className: "subtle" }, `Registry: accidents ${driver.accidentCount || 0} | challans ${driver.challanCount || 0}`),
        driver.pickupDistanceKm !== undefined ? h("div", { className: "match-row" },
            h("span", null, `${driver.pickupDistanceKm} km from pickup`),
            h("span", null, `${driver.etaToPickupMinutes} min arrival`),
            h("span", null, `Match ${driver.matchScore}`)
        ) : null,
        h("span", { className: "subtle" }, `${driver.seats} seats | Trips ${driver.trips}`)
    );
}

function PaymentPanel({ ride, paymentMethod, setPaymentMethod, onPay, userBalance }) {
    const [cardDetails, setCardDetails] = useState("");
    const [upiDetails, setUpiDetails] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const handlePay = () => {
        setErrorMsg("");
        if (paymentMethod === "WALLET") {
            if (userBalance < ride.fare) {
                setErrorMsg("Insufficient wallet balance. Please top up your wallet or choose another payment method.");
                return;
            }
            onPay(ride.id, "WALLET", "");
        } else if (paymentMethod === "CARD") {
            if (!cardDetails || !cardDetails.match(/^\d{16}$/)) {
                setErrorMsg("Invalid card format. Please enter a 16-digit card number.");
                return;
            }
            onPay(ride.id, "CARD", cardDetails);
        } else if (paymentMethod === "UPI") {
            if (!upiDetails || !upiDetails.includes("@")) {
                setErrorMsg("Invalid UPI ID. Please enter a valid ID containing '@' (e.g. user@upi).");
                return;
            }
            onPay(ride.id, "UPI", upiDetails);
        } else {
            // CASH
            onPay(ride.id, "CASH", "");
        }
    };

    return h("div", { className: "payment-box" },
        h("div", { className: "payment-head" },
            h("div", null, h("strong", null, "Complete payment"), h("span", null, `Fare total Rs ${ride.fare} for ${ride.vehicleLabel}`)),
            h("span", { className: "payment-total" }, `Rs ${ride.fare}`)
        ),
        h("div", { className: "payment-methods", role: "group", "aria-label": "Choose payment method" },
            paymentMethods.map(method => h("button", {
                key: method.id,
                type: "button",
                className: cx("payment-option", paymentMethod === method.id && "active"),
                onClick: () => { setPaymentMethod(method.id); setErrorMsg(""); }
            }, h("strong", null, method.label), h("span", null, method.detail)))
        ),
        paymentMethod === "CARD" ? h("div", { className: "payment-details-inputs" },
            Field({
                label: "Card Number",
                children: h("input", {
                    value: cardDetails,
                    onChange: e => setCardDetails(e.target.value.replace(/\D/g, "").slice(0, 16)),
                    placeholder: "xxxx xxxx xxxx xxxx (16 digits)",
                    maxLength: 16,
                    type: "text",
                    required: true
                })
            })
        ) : null,
        paymentMethod === "UPI" ? h("div", { className: "payment-details-inputs" },
            Field({
                label: "UPI ID",
                children: h("input", {
                    value: upiDetails,
                    onChange: e => setUpiDetails(e.target.value),
                    placeholder: "username@bank / username@upi",
                    type: "text",
                    required: true
                })
            })
        ) : null,
        paymentMethod === "WALLET" ? h("div", { className: "wallet-info-status" },
            h("span", null, `Wallet balance: Rs ${Number(userBalance || 0).toFixed(2)}`),
            userBalance < ride.fare ? h("span", { className: "wallet-warning" }, " (Insufficient balance)") : null
        ) : null,
        errorMsg ? h("div", { className: "payment-error-banner" }, errorMsg) : null,
        h("button", { className: "primary", onClick: handlePay }, `Pay with ${paymentMethod}`)
    );
}

function Receipt({ ride }) {
    return h("div", { className: "receipt-box" },
        h("div", null, h("strong", null, "Payment completed"), h("span", null, `${ride.paymentMethod || "UPI"} | ${ride.paymentReference || "Receipt generated"}`)),
        h("span", null, ride.paidAt || "Paid")
    );
}

function RatingControl({ ride, onRate }) {
    if (ride.riderRating) {
        return h("div", { className: "rating-summary" },
            h(Stars, { rating: ride.riderRating }),
            h("span", null, `Your rating updated ${ride.driverName}'s score.`)
        );
    }
    return h("div", { className: "rating-box" },
        h("strong", null, "Rate your driver"),
        h("div", { className: "star-actions", role: "group", "aria-label": "Rate driver" },
            [1, 2, 3, 4, 5].map(star => h("button", {
                key: star,
                type: "button",
                title: `${star} star${star > 1 ? "s" : ""}`,
                onClick: () => onRate(ride.id, star)
            }, String.fromCharCode(9733)))
        )
    );
}

function RiderRideCard({ ride, paymentMethod, setPaymentMethod, onPay, onCancel, onRate, userBalance }) {
    if (!ride) return h("p", { className: "subtle" }, "No ride yet. Confirm a ride to send it to nearby drivers.");
    return h("article", { className: "ride-card" },
        h("div", { className: "ride-head" },
            h("strong", null, `#${ride.id} ${shortName(ride.pickupAddress)} to ${shortName(ride.dropAddress)}`),
            h("span", { className: cx("pill", ride.status) }, ride.status)
        ),
        h("span", null, `${ride.vehicleLabel} | Rs ${ride.fare} | ${ride.distanceKm} km`),
        ride.driverName === "Searching"
            ? h("span", { className: "subtle" }, "Waiting for driver to confirm your ride")
            : h("div", { className: "driver-safety" },
                h("span", null, h("strong", null, ride.driverName), ` | ${ride.vehicle} | ${ride.driverPhone}`),
                h("span", null,
                    h(Stars, { rating: ride.driverRating }),
                    ` ${Number(ride.driverRating).toFixed(1)} | Ride hours ${formatWorkMinutes(ride.driverWorkMinutesToday)} today `,
                    h(SafetyBadge, { status: ride.driverWorkStatus })
                ),
                ride.durationMinutes ? h("span", null, `This trip duration: ${formatWorkMinutes(ride.durationMinutes)}`) : null,
                h(SafetyWarning, { status: ride.driverWorkStatus, audience: "rider" })
            ),
        ride.status === "REQUESTED" ? h("div", { className: "waiting-card" },
            h("span", { className: "spinner" }),
            h("div", null, h("strong", null, "Waiting for driver to confirm"), h("span", null, `Nearby ${ride.vehicleLabel.toLowerCase()} drivers can see your request now.`))
        ) : null,
        ride.status === "ACCEPTED" ? h("div", { className: "otp-box" }, "Start OTP: ", h("strong", null, ride.otp)) : null,
        ride.status === "COMPLETED" && !ride.paid ? h(PaymentPanel, { ride, paymentMethod, setPaymentMethod, onPay, userBalance }) : null,
        ride.status === "COMPLETED" && ride.paid ? h(Receipt, { ride }) : null,
        ride.status === "COMPLETED" && ride.paid ? h(RatingControl, { ride, onRate }) : null,
        ["REQUESTED", "ACCEPTED"].includes(ride.status) ? h("button", { onClick: () => onCancel(ride.id) }, "Cancel ride") : null
    );
}

function WalletDashboardPanel({ user, transactions, onTopUp, fetchTransactions }) {
    const [topUpAmount, setTopUpAmount] = useState("");
    const [topUpMethod, setTopUpMethod] = useState("CARD");
    const [topUpDetails, setTopUpDetails] = useState("");
    const [topUpError, setTopUpError] = useState("");
    const [topUpSuccess, setTopUpSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handlePreset = (amount) => {
        setTopUpAmount(amount.toString());
        setTopUpError("");
        setTopUpSuccess("");
    };

    const handleTopUpSubmit = async (e) => {
        e.preventDefault();
        setTopUpError("");
        setTopUpSuccess("");
        const amountNum = parseFloat(topUpAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setTopUpError("Please enter a valid amount greater than 0");
            return;
        }

        if (topUpMethod === "CARD") {
            if (!topUpDetails || !topUpDetails.match(/^\d{16}$/)) {
                setTopUpError("Invalid card format. Please enter a 16-digit card number.");
                return;
            }
        } else if (topUpMethod === "UPI") {
            if (!topUpDetails || !topUpDetails.includes("@")) {
                setTopUpError("Invalid UPI ID format. Must contain '@' (e.g. user@upi).");
                return;
            }
        }

        setSubmitting(true);
        try {
            await onTopUp(amountNum, topUpMethod, topUpDetails);
            setTopUpSuccess(`Successfully topped up Rs ${amountNum.toFixed(2)}!`);
            setTopUpAmount("");
            setTopUpDetails("");
        } catch (err) {
            setTopUpError(err.message || "Failed to process top-up.");
        } finally {
            setSubmitting(false);
        }
    };

    const balance = user ? (user.role === "DRIVER" ? (user.walletBalance ?? 500.0) : (user.walletBalance ?? 1500.0)) : 0;

    return h("div", { className: "wallet-ledger-panel wide" },
        user?.role === "RIDER" ? h("div", { className: "panel topup-card" },
            SectionTitle({ title: "Top Up Wallet", meta: "Add money instantly" }),
            h("form", { onSubmit: handleTopUpSubmit },
                h("div", { className: "preset-buttons" },
                    [100, 500, 1000].map(amt => h("button", {
                        key: amt,
                        type: "button",
                        className: cx("preset-btn", Number(topUpAmount) === amt && "active"),
                        onClick: () => handlePreset(amt)
                    }, `+ Rs ${amt}`))
                ),
                h("div", { className: "grid two" },
                    Field({
                        label: "Amount (Rs)",
                        children: h("input", {
                            type: "number",
                            value: topUpAmount,
                            onChange: e => { setTopUpAmount(e.target.value); setTopUpError(""); setTopUpSuccess(""); },
                            placeholder: "Enter amount",
                            min: "1",
                            required: true
                        })
                    }),
                    Field({
                        label: "Top-up Method",
                        children: h("select", {
                            value: topUpMethod,
                            onChange: e => { setTopUpMethod(e.target.value); setTopUpDetails(""); setTopUpError(""); setTopUpSuccess(""); }
                        },
                            h("option", { value: "CARD" }, "Debit/Credit Card"),
                            h("option", { value: "UPI" }, "UPI / Instant Pay")
                        )
                    })
                ),
                Field({
                    label: topUpMethod === "CARD" ? "16-digit Card Number" : "UPI ID",
                    children: h("input", {
                        type: "text",
                        value: topUpDetails,
                        onChange: e => {
                            let val = e.target.value;
                            if (topUpMethod === "CARD") {
                                val = val.replace(/\D/g, "").slice(0, 16);
                            }
                            setTopUpDetails(val);
                            setTopUpError("");
                            setTopUpSuccess("");
                        },
                        placeholder: topUpMethod === "CARD" ? "xxxx xxxx xxxx xxxx" : "username@bank",
                        maxLength: topUpMethod === "CARD" ? 16 : 50,
                        required: true
                    })
                }),
                topUpError ? h("div", { className: "error-banner-small" }, topUpError) : null,
                topUpSuccess ? h("div", { className: "success-banner-small" }, topUpSuccess) : null,
                h("button", { type: "submit", className: "primary topup-submit-btn", disabled: submitting },
                    submitting ? "Processing..." : "Add to Wallet"
                )
            )
        ) : null,
        h("div", { className: "panel ledger-card" },
            SectionTitle({
                title: "Transaction Ledger History",
                meta: `${user?.role === "RIDER" ? "Wallet" : "Earnings"} statement logs`,
                action: h("button", { type: "button", onClick: fetchTransactions, className: "ghost btn-sm" }, "Refresh Ledger")
            }),
            h("div", { className: "transaction-list-container" },
                transactions.length === 0
                    ? h("p", { className: "subtle" }, "No transactions found yet. Complete a trip or top up to populate your statement ledger.")
                    : h("div", { className: "tx-table-wrapper" },
                        h("table", { className: "transaction-table" },
                            h("thead", null,
                                h("tr", null,
                                    h("th", null, "Transaction Details"),
                                    h("th", null, "Method / Ref"),
                                    h("th", { className: "text-right" }, "Amount")
                                )
                            ),
                            h("tbody", null,
                                transactions.map(tx => {
                                    const isDebit = tx.amount < 0;
                                    const amtString = isDebit
                                        ? `- Rs ${Math.abs(tx.amount).toFixed(2)}`
                                        : `+ Rs ${tx.amount.toFixed(2)}`;
                                    const typeLabel = tx.type === "WALLET_TOPUP"
                                        ? "Top Up"
                                        : tx.type === "RIDE_FARE"
                                            ? "Ride Fare"
                                            : "Ride Earnings";

                                    return h("tr", { key: tx.id },
                                        h("td", null,
                                            h("div", { className: "tx-type-desc" },
                                                h("span", { className: cx("tx-badge", tx.type.toLowerCase()) }, typeLabel),
                                                h("span", { className: "tx-desc" }, tx.description)
                                            ),
                                            h("small", { className: "tx-date" }, tx.createdAt)
                                        ),
                                        h("td", null,
                                            h("div", { className: "tx-ref-container" },
                                                h("strong", null, tx.paymentMethod),
                                                h("small", null, tx.paymentReference)
                                            )
                                        ),
                                        h("td", { className: cx("tx-amount text-right", isDebit ? "debit" : "credit") }, amtString)
                                    );
                                })
                            )
                        )
                    )
            )
        )
    );
}

function RiderDashboard(props) {
    const {
        pickupAddress, setPickupAddress, dropAddress, setDropAddress, pickup, drop,
        setPickup, setDrop, estimates, vehicleType, setVehicleType, availableDrivers,
        latestRide, status, loadEstimates, requestRide, refreshRider, paymentMethod,
        setPaymentMethod, payRide, cancelRide, rateRide, liveStatus, activeTab
    } = props;
    const selectedEstimate = estimates.find(estimate => estimate.vehicleType === vehicleType);

    return h("section", { className: "app-grid" },
        h(DashboardStrip, {
            items: [
                { label: "Total bookings", value: props.ridesCount },
                { label: "Current trip", value: latestRide?.status || "Idle" },
                { label: "Wallet balance", value: `Rs ${Number(props.user?.walletBalance || 0).toFixed(2)}` },
                { label: "Realtime", value: liveStatus }
            ]
        }),
        h("div", { className: "dashboard-tabs-container wide" },
            h("div", { className: "dashboard-tabs" },
                h("button", { type: "button", className: cx("dashboard-tab", activeTab === "dashboard" && "active"), onClick: () => props.setActiveTab("dashboard") }, "Ride Dashboard"),
                h("button", { type: "button", className: cx("dashboard-tab", activeTab === "wallet" && "active"), onClick: () => { props.setActiveTab("wallet"); props.fetchTransactions(); } }, "Wallet & Statement Ledger")
            )
        ),
        activeTab === "wallet"
            ? h("div", { className: "wallet-tab-content wide" },
                h(WalletDashboardPanel, { user: props.user, transactions: props.transactions, onTopUp: props.topUpWallet, fetchTransactions: props.fetchTransactions })
              )
            : h(React.Fragment, null,
                h(RideNotice, { ride: latestRide }),
                h("div", { className: "panel booking" },
                    SectionTitle({ title: "Book a ride", meta: status }),
                    h("form", { onSubmit: requestRide },
                        h("div", { className: "grid two" },
                            h(PlaceInput, {
                                label: "Pickup",
                                value: pickupAddress,
                                onInput: setPickupAddress,
                                onSelect: place => {
                                    setPickup(place);
                                    setPickupAddress(place.name);
                                }
                            }),
                            h(PlaceInput, {
                                label: "Destination",
                                value: dropAddress,
                                onInput: setDropAddress,
                                onSelect: place => {
                                    setDrop(place);
                                    setDropAddress(place.name);
                                }
                            })
                        ),
                        h(VehicleOptions, {
                            estimates,
                            vehicleType,
                            onSelect: type => {
                                setVehicleType(type);
                                loadEstimates(type);
                            }
                        }),
                        h("div", { className: "actions" },
                            h("button", { type: "button", onClick: () => loadEstimates(vehicleType) }, "Show vehicles"),
                            h("button", { type: "submit", className: "primary" }, "Confirm ride")
                        )
                    )
                ),
                h(MapPanel, {
                    title: "Live Map",
                    meta: mapText(latestRide),
                    pickup: latestRide ? ridePoint(latestRide, "pickup") : pickup,
                    drop: latestRide ? ridePoint(latestRide, "drop") : drop,
                    progress: latestRide?.progressPercent || 0
                }),
                h("div", { className: "panel available-drivers-panel" },
                    SectionTitle({ title: "Available Drivers", meta: `${availableDrivers.length} online` }),
                    h("div", { className: "driver-list" },
                        availableDrivers.length
                            ? availableDrivers.map(driver => h(DriverCard, { key: driver.id, driver }))
                            : h("p", { className: "subtle" }, `No ${vehicleType} drivers are online right now.`)
                    )
                ),
                h("div", { className: "panel" },
                    SectionTitle({
                        title: "Your ride",
                        action: h("button", { type: "button", onClick: refreshRider }, "Refresh")
                    }),
                    h("div", { className: "ride-list" },
                        h(RiderRideCard, { ride: latestRide, paymentMethod, setPaymentMethod, onPay: payRide, onCancel: cancelRide, onRate: rateRide, userBalance: props.user?.walletBalance })
                    )
                )
            )
    );
}

function DriverVerificationPanel({ driver }) {
    const checks = [
        ["License", driver?.licenseValid],
        ["RC", driver?.rcValid],
        ["Insurance", driver?.insuranceValid],
        ["Blacklist", !driver?.vehicleBlacklisted]
    ];
    return h("div", { className: "panel driver-verification-panel" },
        SectionTitle({
            title: "Background Verification",
            meta: driver?.verificationMessage || "Verification profile will load after login.",
            action: h(VerificationBadge, { status: driver?.verificationStatus })
        }),
        h("div", { className: "verification-grid" },
            h("div", null, h("strong", null, driver?.drivingLicenseNumber || "Pending"), h("span", null, "Driving license")),
            h("div", null, h("strong", null, driver?.rcNumber || "Pending"), h("span", null, "RC number")),
            h("div", null, h("strong", null, driver?.insurancePolicyNumber || "Pending"), h("span", null, "Insurance policy")),
            h("div", null, h("strong", null, `${driver?.accidentCount || 0} / ${driver?.challanCount || 0}`), h("span", null, "Accidents / challans"))
        ),
        h("div", { className: "verification-checks" },
            checks.map(([label, passed]) => h("span", {
                key: label,
                className: cx("verification-check", passed ? "passed" : "failed")
            }, `${label}: ${passed ? "Clear" : "Needs review"}`))
        )
    );
}

function DriverSafetyPanel({ driver, onToggle }) {
    const minutes = Number(driver?.workMinutesToday) || 0;
    const safeLimit = Number(driver?.safeDailyMinutes) || 480;
    const overtimeLimit = Number(driver?.overtimeDailyMinutes) || 600;
    const remainingSafe = Math.max(0, safeLimit - minutes);
    const remainingOvertime = Math.max(0, overtimeLimit - minutes);
    const status = driver?.workStatus || "UNKNOWN";
    const text = status === "SAFE"
        ? `${formatWorkMinutes(remainingSafe)} safe driving time left before rest is advised.`
        : status === "NEEDS_REST"
            ? `Rest is advised now. ${formatWorkMinutes(remainingOvertime)} left before overtime risk.`
            : status === "OVERTIME"
                ? "Overtime risk reached. Go offline and rest before accepting more trips."
                : "Driver profile will load after login.";

    return h("div", { className: "panel driver-safety-panel" },
        SectionTitle({
            title: "Driver Safety Hours",
            meta: text,
            action: h(SafetyBadge, { status })
        }),
        h("div", { className: "safety-meter" },
            h("span", { style: { width: `${Math.min(100, Math.round((minutes / overtimeLimit) * 100))}%` } })
        ),
        h("div", { className: "duty-stats" },
            [
                ["Ride hours today", formatWorkMinutes(minutes)],
                ["Safe limit", formatWorkMinutes(safeLimit)],
                ["Overtime limit", formatWorkMinutes(overtimeLimit)],
                ["Trips completed", driver?.trips || 0]
            ].map(([label, value]) => h("div", { key: label }, h("strong", null, value), h("span", null, label)))
        ),
        h("div", { className: "actions" },
            h("button", {
                className: cx(!driver?.onDuty && "primary", status === "OVERTIME" && "danger"),
                onClick: onToggle
            }, driver?.onDuty ? "Go offline and rest" : "Start duty")
        )
    );
}

function DriverRequestCard({ ride, onAccept }) {
    return h("article", { className: "ride-card" },
        h("div", { className: "ride-head" },
            h("strong", null, `#${ride.id} ${ride.riderName}`),
            h("span", { className: "pill" }, ride.vehicleLabel)
        ),
        h("span", null, `${shortName(ride.pickupAddress)} to ${shortName(ride.dropAddress)}`),
        h("span", null, `Rs ${ride.fare} | ${ride.distanceKm} km`),
        h("button", { className: "primary", onClick: () => onAccept(ride.id) }, "Accept Ride")
    );
}

function DriverTripCard({ ride, onStart, onProgress, onComplete }) {
    const [otp, setOtp] = useState("");
    return h("article", { className: "ride-card" },
        h("div", { className: "ride-head" },
            h("strong", null, `#${ride.id} ${ride.riderName}`),
            h("span", { className: cx("pill", ride.status) }, ride.status)
        ),
        h("span", null, `${shortName(ride.pickupAddress)} to ${shortName(ride.dropAddress)}`),
        h("span", null, `${ride.vehicleLabel} | Rs ${ride.fare} | OTP required from user`),
        ride.status === "ACCEPTED" ? h("div", { className: "actions" },
            h("input", {
                className: "otp-input",
                value: otp,
                onChange: event => setOtp(event.target.value),
                placeholder: "Enter OTP"
            }),
            h("button", { className: "primary", onClick: () => onStart(ride.id, otp) }, "Verify & Start")
        ) : null,
        ride.status === "IN_PROGRESS" ? h("div", { className: "actions" },
            h("button", { className: "primary", onClick: () => onProgress(ride.id) }, "Update Live Tracking"),
            h("button", { onClick: () => onComplete(ride.id) }, "Complete Ride")
        ) : null,
        ride.durationMinutes ? h("span", { className: "subtle" }, `Trip duration: ${formatWorkMinutes(ride.durationMinutes)}`) : null,
        ride.status === "COMPLETED" && !ride.paid ? h("span", { className: "subtle" }, `Waiting for user payment of Rs ${ride.fare}`) : null,
        ride.status === "COMPLETED" && ride.paid ? h("span", { className: "subtle" }, `Paid by ${ride.paymentMethod || "UPI"} | ${ride.paymentReference || "Receipt generated"}`) : null
    );
}

function DriverDashboard(props) {
    const {
        driver, requests, trips, refreshDriver, acceptRide, startRide, progressRide,
        completeRide, toggleDriverDuty, driverMessage, liveStatus, activeTab, user, transactions, fetchTransactions, setActiveTab
    } = props;
    const active = trips.find(ride => ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(ride.status));

    return h("section", { className: "app-grid" },
        h(DashboardStrip, {
            items: [
                { label: "New requests", value: requests.length },
                { label: "Assigned trips", value: trips.length },
                { label: "Earnings balance", value: `Rs ${Number(driver?.walletBalance || 0).toFixed(2)}` },
                { label: "Availability", value: driver?.onDuty ? "On duty" : "Offline" },
                { label: "Realtime", value: liveStatus }
            ]
        }),
        h("div", { className: "dashboard-tabs-container wide" },
            h("div", { className: "dashboard-tabs" },
                h("button", { type: "button", className: cx("dashboard-tab", activeTab === "dashboard" && "active"), onClick: () => setActiveTab("dashboard") }, "Driver Operations"),
                h("button", { type: "button", className: cx("dashboard-tab", activeTab === "wallet" && "active"), onClick: () => { setActiveTab("wallet"); fetchTransactions(); } }, "Earnings Statement Ledger")
            )
        ),
        activeTab === "wallet"
            ? h("div", { className: "wallet-tab-content wide" },
                h(WalletDashboardPanel, { user: user, transactions: transactions, fetchTransactions: fetchTransactions })
              )
            : h(React.Fragment, null,
                h(DriverSafetyPanel, { driver, onToggle: toggleDriverDuty }),
                h(DriverVerificationPanel, { driver }),
                h(SafetyWarning, { status: driver?.workStatus, audience: "driver" }),
                driverMessage ? h("div", { className: "status-banner", role: "status" },
                    h("div", { className: "status-icon" }),
                    h("div", null, h("strong", null, "Driver update"), h("span", null, driverMessage))
                ) : null,
                h("div", { className: "panel" },
                    SectionTitle({
                        title: "New Ride Requests",
                        action: h("button", { type: "button", onClick: refreshDriver }, "Refresh")
                    }),
                    h("div", { className: "ride-list" },
                        requests.length
                            ? requests.map(ride => h(DriverRequestCard, { key: ride.id, ride, onAccept: acceptRide }))
                            : h("p", { className: "subtle" }, "No new matching ride requests yet.")
                    )
                ),
                h(MapPanel, {
                    title: "Driver Tracking",
                    meta: active ? mapText(active) : "Accept a ride",
                    pickup: active ? ridePoint(active, "pickup") : defaultPickup,
                    drop: active ? ridePoint(active, "drop") : defaultDrop,
                    progress: active?.progressPercent || 0
                }),
                h("div", { className: "panel driver-active" },
                    SectionTitle({ title: "Accepted Trips" }),
                    h("div", { className: "ride-list" },
                        trips.length
                            ? trips.map(ride => h(DriverTripCard, { key: ride.id, ride, onStart: startRide, onProgress: progressRide, onComplete: completeRide }))
                            : h("p", { className: "subtle" }, "Accepted trips will appear here.")
                    )
                )
            )
    );
}

function App() {
    const [authMode, setAuthMode] = useState("login");
    const [role, setRole] = useState("RIDER");
    const [user, setUser] = useState(null);
    const [authMessage, setAuthMessage] = useState("");
    const [pickup, setPickup] = useState(defaultPickup);
    const [drop, setDrop] = useState(defaultDrop);
    const [pickupAddress, setPickupAddress] = useState(defaultPickup.name);
    const [dropAddress, setDropAddress] = useState(defaultDrop.name);
    const [vehicleType, setVehicleType] = useState("CAB");
    const [paymentMethod, setPaymentMethod] = useState("UPI");
    const [estimates, setEstimates] = useState([]);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [latestRide, setLatestRide] = useState(null);
    const [ridesCount, setRidesCount] = useState(0);
    const [riderStatus, setRiderStatus] = useState("Choose pickup and destination");
    const [driver, setDriver] = useState(null);
    const [driverRequests, setDriverRequests] = useState([]);
    const [driverTrips, setDriverTrips] = useState([]);
    const [driverMessage, setDriverMessage] = useState("");
    const [liveStatus, setLiveStatus] = useState("Live updates standby");

    const [activeTab, setActiveTab] = useState("dashboard");
    const [transactions, setTransactions] = useState([]);

    async function fetchTransactions() {
        if (!user) return;
        try {
            const list = await api(`/api/users/${user.id}/transactions`);
            setTransactions(list);
        } catch (error) {
            console.warn("Could not fetch transactions", error);
        }
    }

    async function topUpWallet(amount, method, details) {
        if (!user) return;
        const res = await api(`/api/users/${user.id}/wallet/topup`, {
            method: "POST",
            body: JSON.stringify({ amount, method, details })
        });
        setUser(prev => ({ ...prev, walletBalance: res.walletBalance }));
        await fetchTransactions();
    }

    async function submitAuth(form) {
        setAuthMessage("");
        try {
            const payload = {
                name: form.name,
                phone: form.phone,
                password: form.password,
                role,
                vehicleName: form.vehicleName,
                vehicleNumber: form.vehicleNumber,
                vehicleType: form.vehicleType,
                drivingLicenseNumber: form.drivingLicenseNumber,
                rcNumber: form.rcNumber,
                insurancePolicyNumber: form.insurancePolicyNumber,
                accidentCount: Number(form.accidentCount) || 0,
                challanCount: Number(form.challanCount) || 0
            };
            const loggedIn = await api(`/api/auth/${authMode === "login" ? "login" : "signup"}`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            sessionToken = loggedIn.token || "";
            setUser(loggedIn);
            setLiveStatus("Connecting live updates...");
        } catch (error) {
            setAuthMessage(error.message);
        }
    }

    async function resolvePoint(point, typed, label) {
        if (typed.trim() === point.name) return point;
        const places = await searchPlaces(typed);
        if (!places.length) throw new Error(`Select a valid ${label} place`);
        return {
            name: places[0].display_name,
            lat: Number(places[0].lat),
            lng: Number(places[0].lon)
        };
    }

    async function resolvePlaces() {
        const resolvedPickup = await resolvePoint(pickup, pickupAddress, "pickup");
        const resolvedDrop = await resolvePoint(drop, dropAddress, "destination");
        setPickup(resolvedPickup);
        setDrop(resolvedDrop);
        setPickupAddress(resolvedPickup.name);
        setDropAddress(resolvedDrop.name);
        return { pickup: resolvedPickup, drop: resolvedDrop };
    }

    function ridePayload(points, type = vehicleType) {
        return {
            riderId: user.id,
            pickupAddress: points.pickup.name,
            dropAddress: points.drop.name,
            pickupLat: points.pickup.lat,
            pickupLng: points.pickup.lng,
            dropLat: points.drop.lat,
            dropLng: points.drop.lng,
            vehicleType: type
        };
    }

    async function loadAvailableDrivers(type = vehicleType) {
        const query = new URLSearchParams({
            vehicleType: type,
            pickupLat: pickup.lat,
            pickupLng: pickup.lng
        });
        const drivers = await api(`/api/drivers/available?${query}`);
        setAvailableDrivers(drivers);
    }

    async function loadEstimates(type = vehicleType) {
        try {
            setRiderStatus("Loading fare and driver options...");
            const points = await resolvePlaces();
            const payload = ridePayload(points, type);
            const query = new URLSearchParams({
                pickupLat: payload.pickupLat,
                pickupLng: payload.pickupLng,
                dropLat: payload.dropLat,
                dropLng: payload.dropLng
            });
            const nextEstimates = await api(`/api/fare-estimates?${query}`);
            setEstimates(nextEstimates);
            await loadAvailableDrivers(type);
            setRiderStatus("Choose pickup and destination");
        } catch (error) {
            setRiderStatus(error.message);
        }
    }

    async function requestRide(event) {
        event.preventDefault();
        try {
            setRiderStatus("Sending request to nearby drivers...");
            const points = await resolvePlaces();
            const ride = await api("/api/rides", {
                method: "POST",
                body: JSON.stringify(ridePayload(points))
            });
            setLatestRide(ride);
            await refreshRider();
        } catch (error) {
            setRiderStatus(error.message);
        }
    }

    async function refreshRider() {
        if (!user || user.role !== "RIDER") return;
        const rides = await api(`/api/riders/${user.id}/rides`);
        setRidesCount(rides.length);
        setLatestRide(rides[0] || null);
    }

    async function refreshDriver() {
        if (!user || user.role !== "DRIVER") return;
        const [driverPayload, requests, trips] = await Promise.all([
            api(`/api/drivers/${user.driverId}`),
            api(`/api/drivers/${user.driverId}/requests`),
            api(`/api/drivers/${user.driverId}/rides`)
        ]);
        setDriver(driverPayload);
        setDriverRequests(requests);
        setDriverTrips(trips);
    }

    async function acceptRide(id) {
        await api(`/api/rides/${id}/accept`, {
            method: "PATCH",
            body: JSON.stringify({ driverId: user.driverId })
        });
        await refreshDriver();
    }

    async function startRide(id, otp) {
        try {
            setDriverMessage("");
            await api(`/api/rides/${id}/start`, {
                method: "PATCH",
                body: JSON.stringify({ otp })
            });
            await refreshDriver();
        } catch (error) {
            setDriverMessage(error.message);
        }
    }

    async function progressRide(id) {
        await api(`/api/rides/${id}/progress`, { method: "PATCH", body: "{}" });
        await refreshDriver();
    }

    async function completeRide(id) {
        await api(`/api/rides/${id}/complete`, { method: "PATCH", body: "{}" });
        await refreshDriver();
    }

    async function refreshUserProfile() {
        if (!user) return;
        try {
            const updatedProfile = await api(`/api/users/${user.id}`);
            setUser(prev => ({ ...prev, ...updatedProfile }));
        } catch (error) {
            console.warn("Could not refresh user profile", error);
        }
    }

    async function payRide(id, method, details) {
        await api(`/api/rides/${id}/pay`, {
            method: "PATCH",
            body: JSON.stringify({ method: method || paymentMethod, details: details || "" })
        });
        await refreshRider();
        await refreshUserProfile();
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
        setRiderStatus("Thanks for the feedback");
        await refreshRider();
    }

    async function toggleDriverDuty() {
        if (!driver) return;
        await api(`/api/drivers/${user.driverId}/availability`, {
            method: "PATCH",
            body: JSON.stringify({ available: !driver.onDuty })
        });
        await refreshDriver();
    }

    useEffect(() => {
        if (!user) return;
        if (user.role === "RIDER") {
            loadEstimates(vehicleType);
            refreshRider();
        }
        if (user.role === "DRIVER") {
            refreshDriver();
        }
    }, [user]);

    useEffect(() => {
        if (!user || !sessionToken) return;
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const host = window.location.host.includes("localhost:8081") ? window.location.host : "localhost:8081";
        const socket = new WebSocket(`${protocol}://${host}/ws/rides?token=${encodeURIComponent(sessionToken)}`);
        socket.addEventListener("open", () => {
            setLiveStatus("Live updates connected");
            socket.send(JSON.stringify({ type: "PING" }));
        });
        socket.addEventListener("message", event => {
            const payload = JSON.parse(event.data);
            if (payload.type === "CONNECTED") {
                setLiveStatus(payload.message);
                return;
            }
            if (payload.type === "RIDE_UPDATED" || payload.type === "DRIVER_UPDATED") {
                setLiveStatus("Live update received");
                if (user.role === "RIDER") {
                    refreshRider();
                    loadAvailableDrivers(vehicleType);
                }
                if (user.role === "DRIVER") {
                    refreshDriver();
                }
            }
        });
        socket.addEventListener("close", () => setLiveStatus("Live updates reconnect on refresh"));
        socket.addEventListener("error", () => setLiveStatus("Live updates unavailable"));
        return () => socket.close();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const timer = setInterval(() => {
            if (user.role === "RIDER") refreshRider();
            if (user.role === "DRIVER") refreshDriver();
        }, 6000);
        return () => clearInterval(timer);
    }, [user, paymentMethod]);

    const view = user ? user.role.toLowerCase() : "auth";

    return h(React.Fragment, null,
        h(Topbar, { user, view, onLogout: () => window.location.reload(), onWalletClick: (tab) => setActiveTab(tab) }),
        h("main", { className: "shell" },
            !user ? h(AuthView, { role, setRole, authMode, setAuthMode, onSubmit: submitAuth, message: authMessage }) : null,
            user?.role === "RIDER" ? h(RiderDashboard, {
                pickupAddress, setPickupAddress, dropAddress, setDropAddress,
                pickup, drop, setPickup, setDrop, estimates, vehicleType, setVehicleType,
                availableDrivers, latestRide, status: riderStatus, loadEstimates, requestRide,
                refreshRider, paymentMethod, setPaymentMethod, payRide, cancelRide, rateRide,
                ridesCount,
                liveStatus,
                activeTab,
                setActiveTab,
                transactions,
                fetchTransactions,
                topUpWallet,
                user
            }) : null,
            user?.role === "DRIVER" ? h(DriverDashboard, {
                driver, requests: driverRequests, trips: driverTrips, refreshDriver,
                acceptRide, startRide, progressRide, completeRide, toggleDriverDuty, driverMessage, liveStatus,
                activeTab,
                setActiveTab,
                transactions,
                fetchTransactions,
                user
            }) : null
        )
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
