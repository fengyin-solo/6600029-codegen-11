package com.drone.model;

import java.util.List;

public class DroneUnit {
    private String id;
    private String name;
    private String color;
    private List<Waypoint> waypoints;
    private Payload payload;
    private DroneStats stats;

    public static class DroneStats {
        private double distance;
        private double estimatedTime;
        private double batteryUsage;

        public DroneStats() {}

        public DroneStats(double distance, double estimatedTime, double batteryUsage) {
            this.distance = distance;
            this.estimatedTime = estimatedTime;
            this.batteryUsage = batteryUsage;
        }

        public double getDistance() { return distance; }
        public void setDistance(double distance) { this.distance = distance; }
        public double getEstimatedTime() { return estimatedTime; }
        public void setEstimatedTime(double estimatedTime) { this.estimatedTime = estimatedTime; }
        public double getBatteryUsage() { return batteryUsage; }
        public void setBatteryUsage(double batteryUsage) { this.batteryUsage = batteryUsage; }
    }

    public DroneUnit() {}

    public DroneUnit(String id, String name, String color, List<Waypoint> waypoints, Payload payload, DroneStats stats) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.waypoints = waypoints;
        this.payload = payload;
        this.stats = stats;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public List<Waypoint> getWaypoints() { return waypoints; }
    public void setWaypoints(List<Waypoint> waypoints) { this.waypoints = waypoints; }
    public Payload getPayload() { return payload; }
    public void setPayload(Payload payload) { this.payload = payload; }
    public DroneStats getStats() { return stats; }
    public void setStats(DroneStats stats) { this.stats = stats; }
}
