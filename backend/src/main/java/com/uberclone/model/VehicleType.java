package com.uberclone.model;

public enum VehicleType {
    BIKE("Bike", 20, 8, 1),
    AUTO("Auto", 30, 11, 3),
    CAB("Cab (5 seater)", 45, 16, 5),
    SUV("SUV (7 seater)", 70, 23, 7);

    private final String label;
    private final double baseFare;
    private final double perKmFare;
    private final int seats;

    VehicleType(String label, double baseFare, double perKmFare, int seats) {
        this.label = label;
        this.baseFare = baseFare;
        this.perKmFare = perKmFare;
        this.seats = seats;
    }

    public String getLabel() {
        return label;
    }

    public double getBaseFare() {
        return baseFare;
    }

    public double getPerKmFare() {
        return perKmFare;
    }

    public int getSeats() {
        return seats;
    }
}
