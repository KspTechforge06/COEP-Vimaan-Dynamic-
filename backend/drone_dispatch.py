import asyncio
from mavsdk import System

async def dispatch(lat, lon):

    drone = System()
    await drone.connect(system_address="udp://:14540")

    async for state in drone.core.connection_state():
        if state.is_connected:
            break

    await drone.action.arm()
    await drone.action.takeoff()

    await asyncio.sleep(5)

    await drone.action.goto_location(lat, lon, 20, 0)

asyncio.run(dispatch(47.3977,8.5455))
