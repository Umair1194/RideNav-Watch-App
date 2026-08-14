package com.ridenav.balance.bridge;

final class NavState {
    static final NavState INSTANCE = new NavState();
    volatile boolean active;
    volatile String instruction = "";
    volatile String distance = "";
    volatile String eta = "";
    volatile String road = "";
    volatile String maneuverType = "unknown";
    volatile String maneuverModifier = "straight";
    volatile int roundaboutExit;
    volatile long updatedAt;

    synchronized void update(NavParser.Result result) {
        active = result.active;
        instruction = result.instruction;
        distance = result.distance;
        eta = result.eta;
        road = result.road;
        maneuverType = result.maneuverType;
        maneuverModifier = result.maneuverModifier;
        roundaboutExit = result.roundaboutExit;
        updatedAt = System.currentTimeMillis();
    }

    synchronized void clear() {
        active = false; instruction = ""; distance = ""; eta = ""; road = "";
        maneuverType = "unknown"; maneuverModifier = "straight"; roundaboutExit = 0; updatedAt = System.currentTimeMillis();
    }
}
