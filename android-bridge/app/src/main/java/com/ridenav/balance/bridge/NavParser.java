package com.ridenav.balance.bridge;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class NavParser {
    private static final Pattern DISTANCE = Pattern.compile("(?i)(\\d+(?:[.,]\\d+)?\\s?(?:m|km|ft|mi))\\b");
    private static final Pattern ETA = Pattern.compile("(?i)(?:ETA\\s*)?([0-2]?\\d:[0-5]\\d(?:\\s?[AP]M)?)");
    private static final Pattern EXIT = Pattern.compile("(?i)(?:exit\\s+|take\\s+)(\\d{1,2})(?:st|nd|rd|th)?");
    private static final String[] ACTIONS = {"turn", "continue", "keep", "merge", "exit", "roundabout", "u-turn", "u turn", "head ", "arrive", "destination"};

    static final class Result {
        final boolean active; final String instruction; final String distance; final String eta; final String road;
        final String maneuverType; final String maneuverModifier; final int roundaboutExit;
        final String nextInstruction; final String nextDistance;
        Result(boolean active, String instruction, String distance, String eta, String road) {
            this(active, instruction, distance, eta, road, "", "");
        }
        Result(boolean active, String instruction, String distance, String eta, String road, String nextInstruction, String nextDistance) {
            this.active = active; this.instruction = instruction; this.distance = distance; this.eta = eta; this.road = road;
            this.nextInstruction = nextInstruction; this.nextDistance = nextDistance;
            String[] maneuver = classify(instruction); this.maneuverType = maneuver[0]; this.maneuverModifier = maneuver[1];
            Matcher exit = EXIT.matcher(instruction); this.roundaboutExit = exit.find() ? Integer.parseInt(exit.group(1)) : 0;
        }
    }

    static Result parse(CharSequence... values) {
        List<String> lines = new ArrayList<>();
        for (CharSequence value : values) {
            if (value == null) continue;
            for (String line : value.toString().split("[\\n•|]")) {
                String clean = line.trim(); if (!clean.isEmpty() && !lines.contains(clean)) lines.add(clean);
            }
        }
        String instruction = "", nextInstruction = "", nextDistance = "", distance = "", eta = "", road = "";
        boolean recognized = false;
        for (String line : lines) {
            String lower = line.toLowerCase(Locale.US);
            Matcher dm = DISTANCE.matcher(line); if (distance.isEmpty() && dm.find()) distance = dm.group(1).replace(',', '.');
            Matcher em = ETA.matcher(line); if (eta.isEmpty() && em.find()) eta = em.group(1);
            for (String action : ACTIONS) if (lower.contains(action)) {
                if (instruction.isEmpty()) { instruction = line; recognized = true; }
                else if (!line.equals(instruction) && nextInstruction.isEmpty()) {
                    nextInstruction = line;
                    Matcher next = DISTANCE.matcher(line); if (next.find()) nextDistance = next.group(1).replace(',', '.');
                }
                break;
            }
        }
        for (String line : lines) if (!line.equals(instruction) && !line.equals(nextInstruction) && !DISTANCE.matcher(line).matches() && !ETA.matcher(line).find() && line.length() < 70) { road = line; break; }
        return new Result(recognized && !instruction.isEmpty(), instruction, distance, eta, road, nextInstruction, nextDistance);
    }

    private static String[] classify(String instruction) {
        String value = instruction.toLowerCase(Locale.US);
        if (value.contains("arriv") || value.contains("destination")) return new String[]{"arrive", "straight"};
        if (value.contains("roundabout") || value.contains("rotary")) return new String[]{"roundabout", value.contains("left") ? "left" : "right"};
        if (value.contains("u-turn") || value.contains("u turn")) return new String[]{"turn", value.contains("right") ? "u-turn-right" : "u-turn-left"};
        if (value.contains("merge")) return new String[]{"merge", value.contains("left") ? "left" : "right"};
        if (value.contains("fork") || value.contains("keep left") || value.contains("keep right")) return new String[]{"fork", value.contains("left") ? "left" : "right"};
        if (value.contains("ramp") || value.contains("exit")) return new String[]{"ramp", value.contains("left") ? "left" : "right"};
        if (value.contains("sharp left")) return new String[]{"turn", "sharp-left"};
        if (value.contains("sharp right")) return new String[]{"turn", "sharp-right"};
        if (value.contains("slight left")) return new String[]{"turn", "slight-left"};
        if (value.contains("slight right")) return new String[]{"turn", "slight-right"};
        if (value.contains("left")) return new String[]{"turn", "left"};
        if (value.contains("right")) return new String[]{"turn", "right"};
        return new String[]{"continue", "straight"};
    }
}
