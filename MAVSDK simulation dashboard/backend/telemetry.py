async for position in drone.telemetry.position():
    print(position.latitude_deg,
          position.longitude_deg)
