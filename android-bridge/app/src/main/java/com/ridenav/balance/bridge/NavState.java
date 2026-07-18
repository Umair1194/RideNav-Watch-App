package com.ridenav.balance.bridge;

final class NavState {
    static final NavState INSTANCE = new NavState();
    volatile boolean active;
    volatile String instruction = "";
    volatile String distance = "";
    volatile String eta = "";
    volatile String road = "";
    volatile long updatedAt;

    synchronized void update(NavParser.Result result) {
        active = result.active;
        instruction = result.instruction;
        distance = result.distance;
        eta = result.eta;
        road = result.road;
        updatedAt = System.currentTimeMillis();
    }

    synchronized void clear() {
        active = false; instruction = ""; distance = ""; eta = ""; road = ""; updatedAt = System.currentTimeMillis();
    }
}
