package com.ridenav.balance.bridge;

public final class NavParserTest {
    private static void expect(boolean value, String message) { if (!value) throw new AssertionError(message); }
    public static void main(String[] args) {
        NavParser.Result right = NavParser.parse("250 m", "Turn right onto Main Road", "ETA 12:45 PM");
        expect(right.active && right.maneuverType.equals("turn") && right.maneuverModifier.equals("right"), "right turn");
        expect(right.distance.equals("250 m") && right.eta.equals("12:45 PM"), "distance and ETA");
        NavParser.Result roundabout = NavParser.parse("At the roundabout, take 2nd exit");
        expect(roundabout.maneuverType.equals("roundabout") && roundabout.roundaboutExit == 2, "roundabout exit");
        NavParser.Result merge = NavParser.parse("Merge left onto M2");
        expect(merge.maneuverType.equals("merge") && merge.maneuverModifier.equals("left"), "merge");
        NavParser.Result unrelated = NavParser.parse("How was your visit?");
        expect(!unrelated.active, "unrelated Maps notification must be ignored");
        System.out.println("Android navigation parser tests passed.");
    }
}
