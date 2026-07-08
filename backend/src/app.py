from fastapi import FastAPI

app = FastAPI(title="FastRepo")

@app.get("/")
async def root():
    return {"message" : "Hello world"}
