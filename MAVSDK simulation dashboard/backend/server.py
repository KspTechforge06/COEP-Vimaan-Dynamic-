from fastapi import FastAPI

app = FastAPI()

@app.get("/drone_position")
def get_position():
    return {"lat":47.3977,"lon":8.5455}

@app.get("/incident")
def incident():
    return {"type":"person","camera":"cam2"}
