package com.drone.model;

public class Payload {
    private String type;
    private String name;
    private String icon;
    private String color;
    private String description;

    public Payload() {}

    public Payload(String type, String name, String icon, String color, String description) {
        this.type = type;
        this.name = name;
        this.icon = icon;
        this.color = color;
        this.description = description;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
