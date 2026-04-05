import asyncio
from mavsdk import System

async def run():

    drone = System()
    await drone.connect(system_address="udp://127.0.0.1:14540")

    async for position in drone.telemetry.position():
        print(position.latitude_deg,
              position.longitude_deg)

asyncio.run(run())
