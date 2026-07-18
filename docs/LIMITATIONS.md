# Platform limitations

- This is a foreground navigation display, not a replacement for Google Maps or the system AOD interface.
- Disable Always-On Display for the most reliable live screen. The app detects AOD and warns; it never changes AOD.
- Keeping the AMOLED screen active and GNSS running increases battery consumption and heat. Test ride duration before depending on it.
- Initial routing and rerouting require the paired phone, Zepp app, Bluetooth, and network except in demo mode.
- Zepp OS API level 3.7 Geolocation exposes coordinates but not a documented accuracy or speed value. The engine accepts those fields when a simulator/provider supplies them and otherwise validates coordinates, timing, implied speed, and consecutive samples.
- A client-side Mapbox token can be extracted. Use a restricted development token only; production needs a backend proxy.
- Route progress uses a compact downsampled geometry, so very complex or long routes may need server-side segmentation.
- No real-watch installation was performed in this workspace. Simulator and physical-device validation remain manual hardware steps.
