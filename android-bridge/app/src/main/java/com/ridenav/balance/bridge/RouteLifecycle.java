package com.ridenav.balance.bridge;

final class RouteLifecycle {
    private boolean inactivePublished;
    private String lastSignature = "";
    private String lastManeuverType = "";

    synchronized void markActive(NavParser.Result result) {
        if ("arrive".equals(lastManeuverType) && !"arrive".equals(result.maneuverType)) lastSignature = "";
        lastManeuverType = result.maneuverType;
        inactivePublished = false;
    }

    synchronized void markBoundary() { lastSignature = ""; }

    synchronized boolean markInactive() {
        if (inactivePublished) return false;
        inactivePublished = true;
        lastSignature = "";
        lastManeuverType = "";
        return true;
    }

    synchronized boolean shouldMirror(NavParser.Result result) {
        String signature = result.instruction + "|" + result.distance;
        if (signature.equals(lastSignature)) return false;
        lastSignature = signature;
        return true;
    }
}
